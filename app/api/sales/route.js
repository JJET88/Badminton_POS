import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET all sales with filters and relationships
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cashierId = searchParams.get('cashierId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentType = searchParams.get('paymentType');
    const includeDetails = searchParams.get('includeDetails') === 'true';

    const db = mysqlPool;

    if (includeDetails) {
      // Join tables for complete sales with items and cashier info
      let query = `
        SELECT 
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
        WHERE 1=1
      `;
      const params = [];

      if (cashierId) {
        query += ' AND s.cashierId = ?';
        params.push(cashierId);
      }

      if (startDate) {
        query += ' AND DATE(s.createdAt) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(s.createdAt) <= ?';
        params.push(endDate);
      }

      if (paymentType) {
        query += ' AND s.paymentType = ?';
        params.push(paymentType);
      }

      query += ' ORDER BY s.createdAt DESC, s.id DESC';

      const [rows] = await db.query(query, params);

      // Group by sale_id to organize items under each sale
      const salesMap = new Map();
      rows.forEach(row => {
        if (!salesMap.has(row.sale_id)) {
          salesMap.set(row.sale_id, {
            id: row.sale_id,
            total: row.total,
            subtotal: row.subtotal,
            tax: row.tax,
            discount: row.discount,
            paymentType: row.paymentType,
            voucherCode: row.voucherCode,
            createdAt: row.sale_date,
            cashier: {
              id: row.cashier_id,
              name: row.cashier_name,
              email: row.cashier_email
            },
            items: []
          });
        }

        if (row.item_id) {
          salesMap.get(row.sale_id).items.push({
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
          });
        }
      });

      return NextResponse.json(Array.from(salesMap.values()));
    } else {
      // Simple sales list with optional filters
      let query = 'SELECT s.*, u.name as cashier_name FROM sales s LEFT JOIN users u ON s.cashierId = u.id WHERE 1=1';
      const params = [];

      if (cashierId) {
        query += ' AND s.cashierId = ?';
        params.push(cashierId);
      }

      if (startDate) {
        query += ' AND DATE(s.createdAt) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(s.createdAt) <= ?';
        params.push(endDate);
      }

      if (paymentType) {
        query += ' AND s.paymentType = ?';
        params.push(paymentType);
      }

      query += ' ORDER BY s.createdAt DESC';

      const [rows] = await db.query(query, params);
      return NextResponse.json(rows);
    }
  } catch (e) {
    console.error('❌ GET /api/sales error:', e);
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: e.message },
      { status: 500 }
    );
  }
}

// POST create sale with items and stock management
export async function POST(request) {
  const connection = await mysqlPool.getConnection();
  
  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { 
      total, 
      subtotal, 
      tax, 
      discount = 0,
      paymentType, 
      voucherCode, 
      cashierId,
      items // Array of {productId, quantity, price}
    } = body;

    console.log('📝 POST /api/sales called:', { total, subtotal, tax, discount, paymentType, itemCount: items?.length });

    // Validation
    if (!total || !subtotal || !paymentType) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Missing required fields: total, subtotal, paymentType' },
        { status: 400 }
      );
    }

    if (typeof total !== 'number' || total < 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Total must be a valid non-negative number' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate cashier exists if provided
    if (cashierId) {
      const [cashier] = await connection.query(
        'SELECT id FROM users WHERE id = ? AND role IN ("admin", "user")',
        [cashierId]
      );
      
      if (cashier.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Invalid cashier ID or user does not have permission' },
          { status: 400 }
        );
      }
    }

    // Validate voucher if provided
    if (voucherCode) {
      const [voucher] = await connection.query(
        'SELECT * FROM vouchers WHERE code = ? AND (expiresAt IS NULL OR expiresAt >= NOW())',
        [voucherCode]
      );
      
      if (voucher.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Invalid or expired voucher code' },
          { status: 400 }
        );
      }

      // Check minimum total requirement
      if (voucher[0].minTotal && subtotal < voucher[0].minTotal) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: `Minimum purchase of ${voucher[0].minTotal} required for this voucher`,
            minRequired: voucher[0].minTotal,
            currentSubtotal: subtotal
          },
          { status: 400 }
        );
      }
    }

    // Validate all items
    for (const item of items) {
      if (!item.productId || !item.quantity || item.price === undefined) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Each item must have productId, quantity, and price' },
          { status: 400 }
        );
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Item quantity must be a positive integer' },
          { status: 400 }
        );
      }

      if (typeof item.price !== 'number' || item.price < 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Item price must be a valid non-negative number' },
          { status: 400 }
        );
      }
    }

    // Check stock availability for all items
    for (const item of items) {
      const [product] = await connection.query(
        'SELECT id, title, stock FROM products WHERE id = ?',
        [item.productId]
      );

      if (product.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: `Product ID ${item.productId} not found` },
          { status: 404 }
        );
      }

      if (product[0].stock < item.quantity) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: `Insufficient stock for ${product[0].title}`,
            productId: item.productId,
            available: product[0].stock,
            requested: item.quantity
          },
          { status: 400 }
        );
      }
    }

    // Insert sale
    const [saleResult] = await connection.query(
      `INSERT INTO sales (total, subtotal, tax, discount, paymentType, voucherCode, cashierId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [total, subtotal, tax, discount, paymentType, voucherCode || null, cashierId || null]
    );

    const saleId = saleResult.insertId;
    console.log(`✅ Sale created with ID: ${saleId}`);

    // Insert sale items and update stock
    for (const item of items) {
      // Insert sale item
      await connection.query(
        'INSERT INTO saleitems (saleId, productId, quantity, price) VALUES (?, ?, ?, ?)',
        [saleId, item.productId, item.quantity, item.price]
      );

      // Update product stock
      const [stockUpdate] = await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [item.quantity, item.productId, item.quantity]
      );

      if (stockUpdate.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Stock update failed. Product may have been purchased by another user.' },
          { status: 409 }
        );
      }

      console.log(`📦 Stock updated for product ${item.productId}: -${item.quantity}`);
    }

    await connection.commit();

    // Fetch complete sale with details using JOIN
    const [completeSale] = await connection.query(
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
      [saleId]
    );

    // Organize the response
    const sale = {
      id: saleId,
      total,
      subtotal,
      tax,
      discount,
      paymentType,
      voucherCode,
      cashierId,
      createdAt: completeSale[0]?.sale_date,
      cashier: completeSale[0] ? {
        id: completeSale[0].cashier_id,
        name: completeSale[0].cashier_name,
        email: completeSale[0].cashier_email
      } : null,
      items: completeSale.map(row => ({
        id: row.item_id,
        productId: row.product_id,
        productName: row.product_name,
        quantity: row.quantity,
        price: row.unit_price,
        lineTotal: row.line_total,
        category: row.category,
        image: row.product_image
      }))
    };

    console.log(`✅ Sale ${saleId} created successfully with ${items.length} items`);

    return NextResponse.json(sale, { status: 201 });
  } catch (e) {
    await connection.rollback();
    console.error('❌ POST /api/sales error:', e);
    return NextResponse.json(
      { error: 'Failed to create sale', details: e.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// DELETE sale (cascade deletes sale items)
export async function DELETE(request) {
  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const restoreStock = searchParams.get('restoreStock') === 'true'; // Default false for safety

    if (!id) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ DELETE /api/sales/${id} - restoreStock: ${restoreStock}`);

    // Check if sale exists and get details
    const [existing] = await connection.query(
      'SELECT * FROM sales WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Get sale items before deletion if restoring stock
    let restoredItems = [];
    if (restoreStock) {
      const [saleItems] = await connection.query(
        `SELECT si.productId, si.quantity, p.title 
         FROM saleitems si
         LEFT JOIN products p ON si.productId = p.id
         WHERE si.saleId = ?`,
        [id]
      );

      // Restore stock for each item
      for (const item of saleItems) {
        await connection.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.productId]
        );
        
        restoredItems.push({
          productId: item.productId,
          productTitle: item.title,
          quantity: item.quantity
        });

        console.log(`📦 Restored ${item.quantity} units to product ${item.productId} (${item.title})`);
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

    console.log(`🗑️ Sale ${id} deleted successfully`);

    return NextResponse.json({ 
      success: true,
      message: 'Sale deleted successfully',
      deletedSale: {
        id: existing[0].id,
        total: existing[0].total,
        paymentType: existing[0].paymentType,
        createdAt: existing[0].createdAt
      },
      note: 'Associated sale items were also deleted',
      stockRestored: restoreStock,
      restoredItems: restoredItems
    });
  } catch (e) {
    await connection.rollback();
    console.error('❌ DELETE /api/sales error:', e);
    return NextResponse.json(
      { error: 'Failed to delete sale', details: e.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}