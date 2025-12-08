import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET all sale items with filters and product details
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');
    const productId = searchParams.get('productId');
    const includeDetails = searchParams.get('includeDetails') !== 'false'; // Default true

    const db = mysqlPool;

    if (includeDetails) {
      // Join with products table for detailed information
      let query = `
        SELECT 
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
        WHERE 1=1
      `;
      const params = [];

      if (saleId) {
        query += ' AND si.saleId = ?';
        params.push(saleId);
      }

      if (productId) {
        query += ' AND si.productId = ?';
        params.push(productId);
      }

      query += ' ORDER BY si.id DESC';

      const [rows] = await db.query(query, params);
      return NextResponse.json(rows);
    } else {
      // Simple sale items without joins
      let query = 'SELECT * FROM saleitems WHERE 1=1';
      const params = [];

      if (saleId) {
        query += ' AND saleId = ?';
        params.push(saleId);
      }

      if (productId) {
        query += ' AND productId = ?';
        params.push(productId);
      }

      query += ' ORDER BY id DESC';

      const [rows] = await db.query(query, params);
      return NextResponse.json(rows);
    }
  } catch (e) {
    console.error('GET /api/saleitems error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST add sale item with stock management
export async function POST(request) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { saleId, productId, quantity, price } = body;

    console.log('📝 POST /api/saleitems called:', body);

    // Validation
    if (!saleId || !productId || !quantity || !price) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Missing required fields: saleId, productId, quantity, price' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    if (price < 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    // Verify sale exists
    const [sale] = await connection.query(
      'SELECT id FROM sales WHERE id = ?',
      [saleId]
    );

    if (sale.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Verify product exists and check stock
    const [product] = await connection.query(
      'SELECT id, title, stock FROM products WHERE id = ?',
      [productId]
    );

    if (product.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Product not found or deleted' },
        { status: 404 }
      );
    }

    if (product[0].stock < quantity) {
      await connection.rollback();
      return NextResponse.json(
        { 
          error: `Insufficient stock for ${product[0].title}`,
          available: product[0].stock,
          requested: quantity
        },
        { status: 400 }
      );
    }

    // Check if this product already exists in this sale
    const [existingItem] = await connection.query(
      'SELECT id, quantity FROM saleitems WHERE saleId = ? AND productId = ?',
      [saleId, productId]
    );

    let itemId;

    if (existingItem.length > 0) {
      // Update existing item quantity
      const newQuantity = existingItem[0].quantity + quantity;
      
      await connection.query(
        'UPDATE saleitems SET quantity = ?, price = ? WHERE id = ?',
        [newQuantity, price, existingItem[0].id]
      );

      itemId = existingItem[0].id;
      console.log(`✅ Updated existing item ${itemId} quantity: ${existingItem[0].quantity} → ${newQuantity}`);
    } else {
      // Insert new sale item
      const [result] = await connection.query(
        'INSERT INTO saleitems (saleId, productId, quantity, price) VALUES (?, ?, ?, ?)',
        [saleId, productId, quantity, price]
      );

      itemId = result.insertId;
      console.log(`✅ Created new sale item ${itemId}`);
    }

    // Update product stock
    await connection.query(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [quantity, productId]
    );

    console.log(`📦 Stock updated for product ${productId}: -${quantity}`);

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

    console.log(`💰 Sale ${saleId} totals updated: subtotal=${subtotal}, tax=${tax}, total=${total}`);

    await connection.commit();

    // Fetch complete item details with product info
    const [item] = await connection.query(
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
      [itemId]
    );

    return NextResponse.json(item[0], { status: 201 });
  } catch (e) {
    await connection.rollback();
    console.error('❌ POST /api/saleitems error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT update sale item quantity
export async function PUT(request) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { id, quantity, price } = body;

    console.log('📝 PUT /api/saleitems called:', body);

    if (!id) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Sale item ID is required' },
        { status: 400 }
      );
    }

    // Get current item
    const [currentItem] = await connection.query(
      'SELECT * FROM saleitems WHERE id = ?',
      [id]
    );

    if (currentItem.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Sale item not found' },
        { status: 404 }
      );
    }

    const oldQuantity = currentItem[0].quantity;
    const productId = currentItem[0].productId;
    const saleId = currentItem[0].saleId;

    // Get product stock
    const [product] = await connection.query(
      'SELECT stock, title FROM products WHERE id = ?',
      [productId]
    );

    if (product.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate stock change needed
    const stockChange = quantity - oldQuantity;
    const availableStock = product[0].stock;

    // Check if we have enough stock for increase
    if (stockChange > 0 && availableStock < stockChange) {
      await connection.rollback();
      return NextResponse.json(
        { 
          error: `Insufficient stock for ${product[0].title}`,
          available: availableStock,
          needed: stockChange
        },
        { status: 400 }
      );
    }

    // Update sale item
    const updates = [];
    const params = [];

    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }

    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }

    if (updates.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(id);

    await connection.query(
      `UPDATE saleitems SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Update product stock (negative stockChange means returning stock)
    await connection.query(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [stockChange, productId]
    );

    console.log(`📦 Stock adjusted for product ${productId}: ${stockChange > 0 ? '-' : '+'}${Math.abs(stockChange)}`);

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

    console.log(`💰 Sale ${saleId} totals recalculated`);

    await connection.commit();

    // Fetch updated item with product info
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
    console.error('❌ PUT /api/saleitems error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE sale item with stock restoration
export async function DELETE(request) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const restoreStock = searchParams.get('restoreStock') !== 'false'; // Default true

    if (!id) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Sale item ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ DELETE /api/saleitems/${id} - restoreStock: ${restoreStock}`);

    // Get item details
    const [item] = await connection.query(
      'SELECT * FROM saleitems WHERE id = ?',
      [id]
    );

    if (item.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Sale item not found' },
        { status: 404 }
      );
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

    // Recalculate sale totals
    const [remainingItems] = await connection.query(
      'SELECT quantity, price FROM saleitems WHERE saleId = ?',
      [saleId]
    );

    if (remainingItems.length > 0) {
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
      console.log(`⚠️ Warning: Sale ${saleId} now has no items`);
    }

    await connection.commit();

    return NextResponse.json({
      message: 'Sale item deleted successfully',
      stockRestored: restoreStock,
      quantityRestored: restoreStock ? quantity : 0
    });
  } catch (e) {
    await connection.rollback();
    console.error('❌ DELETE /api/saleitems error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    connection.release();
  }
}