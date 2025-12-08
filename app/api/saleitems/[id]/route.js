import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET sale item by ID with product details
export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale item ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const includeDetails = searchParams.get('includeDetails') !== 'false'; // Default true

    const db = mysqlPool;

    if (includeDetails) {
      // Join with products table for complete details
      const [rows] = await db.query(
        `SELECT 
          si.id as saleitem_id,
          si.saleId,
          si.productId as product_id,
          si.quantity,
          si.price,
          p.title as product_title,
          p.description as product_description,
          p.category as product_category,
          p.image as product_image,
          p.stock as product_stock
        FROM saleitems si
        LEFT JOIN products p ON si.productId = p.id
        WHERE si.id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Sale item not found" }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    } else {
      // Simple sale item without joins
      const [rows] = await db.query(
        'SELECT * FROM saleitems WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Sale item not found" }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    }
  } catch (e) {
    console.error('GET /api/saleitems/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT update sale item with stock adjustment
export async function PUT(request, { params }) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale item ID" }, { status: 400 });
    }

    const body = await request.json();

    console.log('📝 PUT /api/saleitems/[id] called:', { id, body });

    // Get current item
    const [currentItem] = await connection.query(
      'SELECT * FROM saleitems WHERE id = ?',
      [id]
    );

    if (currentItem.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Sale item not found" }, { status: 404 });
    }

    const oldQuantity = currentItem[0].quantity;
    const oldPrice = currentItem[0].price;
    const oldProductId = currentItem[0].productId;
    const saleId = currentItem[0].saleId;

    // Build update fields
    const updates = [];
    const params = [];
    let newQuantity = oldQuantity;
    let newPrice = oldPrice;
    let newProductId = oldProductId;
    let stockAdjustmentNeeded = false;

    // Handle product change
    if (body.productId !== undefined && body.productId !== oldProductId) {
      // Changing product - need to restore stock to old product and deduct from new
      const [oldProduct] = await connection.query(
        'SELECT id, title FROM products WHERE id = ?',
        [oldProductId]
      );

      const [newProduct] = await connection.query(
        'SELECT id, title, stock FROM products WHERE id = ?',
        [body.productId]
      );

      if (newProduct.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'New product not found or deleted' },
          { status: 404 }
        );
      }

      // Check if new product has enough stock
      const requiredQuantity = body.quantity !== undefined ? body.quantity : oldQuantity;
      if (newProduct[0].stock < requiredQuantity) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: `Insufficient stock for ${newProduct[0].title}`,
            available: newProduct[0].stock,
            needed: requiredQuantity
          },
          { status: 400 }
        );
      }

      // Restore stock to old product
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [oldQuantity, oldProductId]
      );

      // Deduct stock from new product
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [requiredQuantity, body.productId]
      );

      console.log(`📦 Stock restored to product ${oldProductId}: +${oldQuantity}`);
      console.log(`📦 Stock deducted from product ${body.productId}: -${requiredQuantity}`);

      updates.push('productId = ?');
      params.push(body.productId);
      newProductId = body.productId;
      newQuantity = requiredQuantity;
      stockAdjustmentNeeded = false; // Already handled
    }

    // Handle quantity change (only if product wasn't changed)
    if (body.quantity !== undefined && body.productId === undefined) {
      if (body.quantity <= 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Quantity must be greater than 0' },
          { status: 400 }
        );
      }

      const stockChange = body.quantity - oldQuantity;

      if (stockChange !== 0) {
        // Get product stock
        const [product] = await connection.query(
          'SELECT stock, title FROM products WHERE id = ?',
          [oldProductId]
        );

        if (product.length === 0) {
          await connection.rollback();
          return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
          );
        }

        // Check if we have enough stock for increase
        if (stockChange > 0 && product[0].stock < stockChange) {
          await connection.rollback();
          return NextResponse.json(
            { 
              error: `Insufficient stock for ${product[0].title}`,
              available: product[0].stock,
              needed: stockChange
            },
            { status: 400 }
          );
        }

        // Update stock
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [stockChange, oldProductId]
        );

        console.log(`📦 Stock adjusted for product ${oldProductId}: ${stockChange > 0 ? '-' : '+'}${Math.abs(stockChange)}`);
      }

      updates.push('quantity = ?');
      params.push(body.quantity);
      newQuantity = body.quantity;
    }

    // Handle price change
    if (body.price !== undefined) {
      if (body.price < 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Price cannot be negative' },
          { status: 400 }
        );
      }
      updates.push('price = ?');
      params.push(body.price);
      newPrice = body.price;
    }

    if (updates.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update sale item
    params.push(id);
    await connection.query(
      `UPDATE saleitems SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    console.log('✅ Sale item updated');

    // Recalculate sale totals
    const [saleItems] = await connection.query(
      'SELECT quantity, price FROM saleitems WHERE saleId = ?',
      [saleId]
    );

    const subtotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.1; // 10% tax
    
    // Get existing discount from sale
    const [saleDetails] = await connection.query(
      'SELECT discount FROM sales WHERE id = ?',
      [saleId]
    );
    
    const discount = saleDetails[0]?.discount || 0;
    const total = subtotal + tax - discount;

    await connection.query(
      'UPDATE sales SET subtotal = ?, tax = ?, total = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [subtotal, tax, total, saleId]
    );

    console.log(`💰 Sale ${saleId} totals recalculated: subtotal=${subtotal}, tax=${tax}, discount=${discount}, total=${total}`);

    await connection.commit();

    // Fetch updated item with details using JOIN
    const [updated] = await connection.query(
      `SELECT 
        si.id as saleitem_id,
        si.saleId,
        si.productId as product_id,
        si.quantity,
        si.price,
        p.title as product_title,
        p.description as product_description,
        p.category as product_category,
        p.image as product_image,
        p.stock as product_stock
      FROM saleitems si
      LEFT JOIN products p ON si.productId = p.id
      WHERE si.id = ?`,
      [id]
    );

    return NextResponse.json(updated[0]);
  } catch (e) {
    await connection.rollback();
    console.error('❌ PUT /api/saleitems/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE sale item with stock restoration
export async function DELETE(req, { params }) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale item ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const restoreStock = searchParams.get('restoreStock') !== 'false'; // Default true

    console.log(`🗑️ DELETE /api/saleitems/${id} - restoreStock: ${restoreStock}`);

    // Get item details
    const [item] = await connection.query(
      'SELECT * FROM saleitems WHERE id = ?',
      [id]
    );

    if (item.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Sale item not found" }, { status: 404 });
    }

    const saleId = item[0].saleId;
    const productId = item[0].productId;
    const quantity = item[0].quantity;

    // Restore stock if requested
    if (restoreStock) {
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [quantity, productId]
      );
      console.log(`📦 Restored ${quantity} units to product ${productId}`);
    }

    // Delete item
    await connection.query('DELETE FROM saleitems WHERE id = ?', [id]);

    console.log(`✅ Sale item ${id} deleted`);

    // Check if sale still has items
    const [remainingItems] = await connection.query(
      'SELECT quantity, price FROM saleitems WHERE saleId = ?',
      [saleId]
    );

    if (remainingItems.length > 0) {
      // Recalculate sale totals
      const subtotal = remainingItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const tax = subtotal * 0.1;
      
      // Get existing discount from sale
      const [saleDetails] = await connection.query(
        'SELECT discount FROM sales WHERE id = ?',
        [saleId]
      );
      
      const discount = saleDetails[0]?.discount || 0;
      const total = subtotal + tax - discount;

      await connection.query(
        'UPDATE sales SET subtotal = ?, tax = ?, total = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [subtotal, tax, total, saleId]
      );

      console.log(`💰 Sale ${saleId} totals recalculated after item removal`);
    } else {
      // Sale has no items - set totals to 0
      await connection.query(
        'UPDATE sales SET subtotal = 0, tax = 0, total = 0, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [saleId]
      );

      console.log(`⚠️ Sale ${saleId} now has no items - totals set to 0`);
    }

    await connection.commit();

    return NextResponse.json({
      message: 'Sale item deleted successfully',
      saleId,
      stockRestored: restoreStock,
      quantityRestored: restoreStock ? quantity : 0,
      saleHasRemainingItems: remainingItems.length > 0
    });
  } catch (e) {
    await connection.rollback();
    console.error('❌ DELETE /api/saleitems/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PATCH - Quick quantity adjustment (add/subtract)
export async function PATCH(request, { params }) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale item ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action, amount } = body;

    console.log('🔧 PATCH /api/saleitems/[id] called:', { id, action, amount });

    // Get current item
    const [currentItem] = await connection.query(
      'SELECT * FROM saleitems WHERE id = ?',
      [id]
    );

    if (currentItem.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Sale item not found" }, { status: 404 });
    }

    const oldQuantity = currentItem[0].quantity;
    const productId = currentItem[0].productId;
    const saleId = currentItem[0].saleId;
    let newQuantity;

    if (action === 'increase') {
      const increaseBy = amount || 1;

      // Check stock availability
      const [product] = await connection.query(
        'SELECT stock, title FROM products WHERE id = ?',
        [productId]
      );

      if (product.length === 0 || product[0].stock < increaseBy) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: `Insufficient stock`,
            available: product[0]?.stock || 0,
            needed: increaseBy
          },
          { status: 400 }
        );
      }

      newQuantity = oldQuantity + increaseBy;

      // Update stock
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [increaseBy, productId]
      );

      console.log(`📦 Stock decreased for product ${productId}: -${increaseBy}`);

    } else if (action === 'decrease') {
      const decreaseBy = amount || 1;

      if (oldQuantity <= decreaseBy) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: `Cannot decrease below 1. Use DELETE to remove item.`,
            currentQuantity: oldQuantity
          },
          { status: 400 }
        );
      }

      newQuantity = oldQuantity - decreaseBy;

      // Restore stock
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [decreaseBy, productId]
      );

      console.log(`📦 Stock restored for product ${productId}: +${decreaseBy}`);

    } else {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Invalid action. Use "increase" or "decrease"' },
        { status: 400 }
      );
    }

    // Update sale item
    await connection.query(
      'UPDATE saleitems SET quantity = ? WHERE id = ?',
      [newQuantity, id]
    );

    console.log(`✅ Item quantity updated: ${oldQuantity} → ${newQuantity}`);

    // Recalculate sale totals
    const [saleItems] = await connection.query(
      'SELECT quantity, price FROM saleitems WHERE saleId = ?',
      [saleId]
    );

    const subtotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.1;
    
    // Get existing discount from sale
    const [saleDetails] = await connection.query(
      'SELECT discount FROM sales WHERE id = ?',
      [saleId]
    );
    
    const discount = saleDetails[0]?.discount || 0;
    const total = subtotal + tax - discount;

    await connection.query(
      'UPDATE sales SET subtotal = ?, tax = ?, total = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [subtotal, tax, total, saleId]
    );

    await connection.commit();

    // Fetch updated item with details using JOIN
    const [updated] = await connection.query(
      `SELECT 
        si.id as saleitem_id,
        si.saleId,
        si.productId as product_id,
        si.quantity,
        si.price,
        p.title as product_title,
        p.description as product_description,
        p.category as product_category,
        p.image as product_image,
        p.stock as product_stock
      FROM saleitems si
      LEFT JOIN products p ON si.productId = p.id
      WHERE si.id = ?`,
      [id]
    );

    return NextResponse.json({
      ...updated[0],
      message: `Quantity ${action}d successfully`,
      oldQuantity,
      newQuantity
    });
  } catch (e) {
    await connection.rollback();
    console.error('❌ PATCH /api/saleitems/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    connection.release();
  }
}