import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET sale by ID with complete details
export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const includeDetails = searchParams.get('includeDetails') !== 'false'; // Default true

    const db = mysqlPool;

    if (includeDetails) {
      // Get complete sale with items using JOIN
      const [rows] = await db.query(
        `SELECT 
          s.id as sale_id,
          s.total,
          s.subtotal,
          s.tax,
          s.discount,
          s.paymentType,
          s.voucherCode,
          s.createdAt as sale_date,
          u.id as cashier_id,
          u.name as cashier_name,
          u.email as cashier_email,
          si.id as item_id,
          si.quantity,
          si.price as unit_price,
          (si.quantity * si.price) as line_total,
          p.id as product_id,
          p.title as product_name,
          p.category,
          p.image as product_image
        FROM sales s
        LEFT JOIN users u ON s.cashierId = u.id
        LEFT JOIN saleitems si ON s.id = si.saleId
        LEFT JOIN products p ON si.productId = p.id
        WHERE s.id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Sale not found" }, { status: 404 });
      }

      // Organize the data
      const sale = {
        id: rows[0].sale_id,
        total: rows[0].total,
        subtotal: rows[0].subtotal,
        tax: rows[0].tax,
        discount: rows[0].discount,
        paymentType: rows[0].paymentType,
        voucherCode: rows[0].voucherCode,
        createdAt: rows[0].sale_date,
        cashier: {
          id: rows[0].cashier_id,
          name: rows[0].cashier_name,
          email: rows[0].cashier_email
        },
        items: rows.filter(r => r.item_id).map(row => ({
          id: row.item_id,
          quantity: row.quantity,
          price: row.unit_price,
          lineTotal: row.line_total,
          product: {
            id: row.product_id,
            name: row.product_name,
            category: row.category,
            image: row.product_image
          }
        }))
      };

      return NextResponse.json(sale);
    } else {
      // Simple sale without items
      const [rows] = await db.query(
        'SELECT * FROM sales WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Sale not found" }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    }
  } catch (e) {
    console.error('❌ GET /api/sales/[id] error:', e);
    return NextResponse.json(
      { error: 'Failed to fetch sale', details: e.message },
      { status: 500 }
    );
  }
}

// PUT update sale (limited fields only)
export async function PUT(request, { params }) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
    }

    const body = await request.json();

    console.log('📝 PUT /api/sales/[id] called:', { id, body });

    // Check if sale exists
    const [exists] = await connection.query(
      'SELECT * FROM sales WHERE id = ?',
      [id]
    );

    if (exists.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Only allow updating certain fields (not total, subtotal, tax)
    // These should be recalculated if items change
    const allowedFields = ['paymentType', 'voucherCode', 'discount'];
    const fields = [];
    const values = [];

    Object.entries(body).forEach(([key, val]) => {
      if (allowedFields.includes(key) && val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
        console.log(`  ✓ Updating field: ${key} = ${val}`);
      }
    });

    if (fields.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "No valid fields to update. Allowed: paymentType, voucherCode, discount" },
        { status: 400 }
      );
    }

    // Validate voucher if being updated
    if (body.voucherCode !== undefined && body.voucherCode !== null) {
      const [voucher] = await connection.query(
        'SELECT * FROM vouchers WHERE code = ? AND (expiresAt IS NULL OR expiresAt >= NOW())',
        [body.voucherCode]
      );
      
      if (voucher.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Invalid or expired voucher code' },
          { status: 400 }
        );
      }

      // Check minimum total requirement
      if (voucher[0].minTotal && exists[0].subtotal < voucher[0].minTotal) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: `Minimum purchase of ${voucher[0].minTotal} required for this voucher`,
            minRequired: voucher[0].minTotal,
            currentSubtotal: exists[0].subtotal
          },
          { status: 400 }
        );
      }
    }

    // If discount is being updated, recalculate total
    if (body.discount !== undefined) {
      const newTotal = exists[0].subtotal + exists[0].tax - body.discount;
      fields.push('total = ?');
      values.push(newTotal);
      console.log(`  💰 Recalculated total: ${newTotal}`);
    }

    // Add updatedAt
    fields.push('updatedAt = CURRENT_TIMESTAMP(3)');
    values.push(id);

    const sql = `UPDATE sales SET ${fields.join(", ")} WHERE id = ?`;
    console.log('🔧 Executing SQL:', sql);

    await connection.query(sql, values);
    await connection.commit();

    // Fetch updated sale with details using JOIN
    const [updated] = await connection.query(
      `SELECT 
        s.id as sale_id,
        s.total,
        s.subtotal,
        s.tax,
        s.discount,
        s.paymentType,
        s.voucherCode,
        s.createdAt as sale_date,
        u.id as cashier_id,
        u.name as cashier_name,
        u.email as cashier_email,
        si.id as item_id,
        si.quantity,
        si.price as unit_price,
        (si.quantity * si.price) as line_total,
        p.id as product_id,
        p.title as product_name,
        p.category,
        p.image as product_image
      FROM sales s
      LEFT JOIN users u ON s.cashierId = u.id
      LEFT JOIN saleitems si ON s.id = si.saleId
      LEFT JOIN products p ON si.productId = p.id
      WHERE s.id = ?`,
      [id]
    );

    if (updated.length === 0) {
      return NextResponse.json({ error: "Sale not found after update" }, { status: 404 });
    }

    // Organize response
    const sale = {
      id: updated[0].sale_id,
      total: updated[0].total,
      subtotal: updated[0].subtotal,
      tax: updated[0].tax,
      discount: updated[0].discount,
      paymentType: updated[0].paymentType,
      voucherCode: updated[0].voucherCode,
      createdAt: updated[0].sale_date,
      cashier: {
        id: updated[0].cashier_id,
        name: updated[0].cashier_name,
        email: updated[0].cashier_email
      },
      items: updated.filter(r => r.item_id).map(row => ({
        id: row.item_id,
        quantity: row.quantity,
        price: row.unit_price,
        lineTotal: row.line_total,
        product: {
          id: row.product_id,
          name: row.product_name,
          category: row.category,
          image: row.product_image
        }
      }))
    };

    console.log('✅ Sale updated:', sale.id);

    return NextResponse.json(sale);
  } catch (e) {
    await connection.rollback();
    console.error('❌ PUT /api/sales/[id] error:', e);
    return NextResponse.json(
      { error: 'Failed to update sale', details: e.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// DELETE sale (with stock restoration option)
export async function DELETE(req, { params }) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);
    const { searchParams } = new URL(req.url);
    const restoreStock = searchParams.get('restoreStock') === 'true';

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
    }

    console.log(`🗑️ DELETE /api/sales/${id} - restoreStock: ${restoreStock}`);

    // Check if sale exists and get items
    const [saleItems] = await connection.query(
      `SELECT si.*, p.title as productTitle 
       FROM saleitems si 
       LEFT JOIN products p ON si.productId = p.id 
       WHERE si.saleId = ?`,
      [id]
    );

    const [sale] = await connection.query(
      'SELECT * FROM sales WHERE id = ?',
      [id]
    );

    if (sale.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Restore stock if requested
    let restoredItems = [];
    if (restoreStock && saleItems.length > 0) {
      for (const item of saleItems) {
        await connection.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.productId]
        );
        
        restoredItems.push({
          productId: item.productId,
          productTitle: item.productTitle,
          quantity: item.quantity
        });

        console.log(`📦 Restored ${item.quantity} units to product ${item.productId} (${item.productTitle})`);
      }
    }

    // Delete sale (cascade will delete sale items due to foreign key)
    const [deleteResult] = await connection.query(
      'DELETE FROM sales WHERE id = ?',
      [id]
    );

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Failed to delete sale' },
        { status: 500 }
      );
    }

    await connection.commit();

    console.log(`✅ Sale ${id} deleted successfully`);

    return NextResponse.json({ 
      success: true,
      message: 'Sale deleted successfully',
      deletedSale: {
        id: sale[0].id,
        total: sale[0].total,
        paymentType: sale[0].paymentType,
        createdAt: sale[0].createdAt
      },
      itemsDeleted: saleItems.length,
      stockRestored: restoreStock,
      restoredItems: restoredItems
    });
  } catch (e) {
    await connection.rollback();
    console.error('❌ DELETE /api/sales/[id] error:', e);
    return NextResponse.json(
      { error: 'Failed to delete sale', details: e.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// PATCH - Add/Update sale items (advanced operation)
export async function PATCH(request, { params }) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action, itemId, productId, quantity, price } = body;

    console.log('🔧 PATCH /api/sales/[id] called:', { id, action, body });

    // Check if sale exists
    const [sale] = await connection.query(
      'SELECT * FROM sales WHERE id = ?',
      [id]
    );

    if (sale.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (action === 'addItem') {
      // Add new item to existing sale
      if (!productId || !quantity || !price) {
        await connection.rollback();
        return NextResponse.json(
          { error: "productId, quantity, and price are required" },
          { status: 400 }
        );
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Quantity must be a positive integer" },
          { status: 400 }
        );
      }

      // Check stock
      const [product] = await connection.query(
        'SELECT stock, title FROM products WHERE id = ?',
        [productId]
      );

      if (product.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Product not found" },
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

      // Insert item
      await connection.query(
        'INSERT INTO saleitems (saleId, productId, quantity, price) VALUES (?, ?, ?, ?)',
        [id, productId, quantity, price]
      );

      // Update stock
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [quantity, productId]
      );

      console.log(`✅ Item added to sale ${id}`);

      // Recalculate sale totals
      const [saleItems] = await connection.query(
        'SELECT quantity, price FROM saleitems WHERE saleId = ?',
        [id]
      );

      const subtotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const tax = subtotal * 0.1;
      const discount = sale[0].discount || 0;
      const total = subtotal + tax - discount;

      await connection.query(
        'UPDATE sales SET subtotal = ?, tax = ?, total = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [subtotal, tax, total, id]
      );

      console.log(`💰 Sale ${id} totals recalculated`);

    } else if (action === 'removeItem') {
      // Remove item from sale
      if (!itemId) {
        await connection.rollback();
        return NextResponse.json(
          { error: "itemId is required" },
          { status: 400 }
        );
      }

      // Get item details for stock restoration
      const [item] = await connection.query(
        'SELECT * FROM saleitems WHERE id = ? AND saleId = ?',
        [itemId, id]
      );

      if (item.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Item not found in this sale" },
          { status: 404 }
        );
      }

      // Restore stock
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item[0].quantity, item[0].productId]
      );

      // Delete item
      await connection.query(
        'DELETE FROM saleitems WHERE id = ?',
        [itemId]
      );

      console.log(`✅ Item ${itemId} removed from sale ${id}`);

      // Recalculate sale totals
      const [remainingItems] = await connection.query(
        'SELECT quantity, price FROM saleitems WHERE saleId = ?',
        [id]
      );

      if (remainingItems.length > 0) {
        const subtotal = remainingItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const tax = subtotal * 0.1;
        const discount = sale[0].discount || 0;
        const total = subtotal + tax - discount;

        await connection.query(
          'UPDATE sales SET subtotal = ?, tax = ?, total = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
          [subtotal, tax, total, id]
        );
      } else {
        // No items left - reset totals
        await connection.query(
          'UPDATE sales SET subtotal = 0, tax = 0, total = 0, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
          [id]
        );
      }

      console.log(`💰 Sale ${id} totals recalculated`);

    } else {
      await connection.rollback();
      return NextResponse.json(
        { error: "Invalid action. Use 'addItem' or 'removeItem'" },
        { status: 400 }
      );
    }

    await connection.commit();

    // Return updated sale using JOIN
    const [updated] = await connection.query(
      `SELECT 
        s.id as sale_id,
        s.total,
        s.subtotal,
        s.tax,
        s.discount,
        s.paymentType,
        s.voucherCode,
        s.createdAt as sale_date,
        u.id as cashier_id,
        u.name as cashier_name,
        u.email as cashier_email,
        si.id as item_id,
        si.quantity,
        si.price as unit_price,
        (si.quantity * si.price) as line_total,
        p.id as product_id,
        p.title as product_name,
        p.category,
        p.image as product_image
      FROM sales s
      LEFT JOIN users u ON s.cashierId = u.id
      LEFT JOIN saleitems si ON s.id = si.saleId
      LEFT JOIN products p ON si.productId = p.id
      WHERE s.id = ?`,
      [id]
    );

    const updatedSale = {
      id: updated[0].sale_id,
      total: updated[0].total,
      subtotal: updated[0].subtotal,
      tax: updated[0].tax,
      discount: updated[0].discount,
      paymentType: updated[0].paymentType,
      voucherCode: updated[0].voucherCode,
      createdAt: updated[0].sale_date,
      cashier: {
        id: updated[0].cashier_id,
        name: updated[0].cashier_name,
        email: updated[0].cashier_email
      },
      items: updated.filter(r => r.item_id).map(row => ({
        id: row.item_id,
        quantity: row.quantity,
        price: row.unit_price,
        lineTotal: row.line_total,
        product: {
          id: row.product_id,
          name: row.product_name,
          category: row.category,
          image: row.product_image
        }
      }))
    };

    return NextResponse.json(updatedSale);
  } catch (e) {
    await connection.rollback();
    console.error('❌ PATCH /api/sales/[id] error:', e);
    return NextResponse.json(
      { error: 'Failed to update sale', details: e.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}