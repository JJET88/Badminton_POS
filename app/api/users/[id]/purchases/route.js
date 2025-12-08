import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET user's purchase history
export async function GET(req, { params }) {
  let connection;
  
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = parseInt(resolvedParams.id);

    console.log('📊 GET /api/users/[id]/purchases called for userId:', userId);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    connection = await mysqlPool.getConnection();
    console.log('✅ Database connection established');

    // Verify user exists
    const [user] = await connection.query(
      'SELECT id, name, email FROM users WHERE id = ?', 
      [userId]
    );
    
    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log('✅ User found:', user[0].name);

    // Get sales for this user
    let salesQuery = `
      SELECT 
        id as sale_id,
        total,
        subtotal,
        tax,
        discount,
        paymentType,
        voucherCode,
        createdAt as purchase_date
      FROM sales
      WHERE cashierId = ?
    `;

    const salesParams = [userId];

    if (startDate) {
      salesQuery += ' AND DATE(createdAt) >= ?';
      salesParams.push(startDate);
    }

    if (endDate) {
      salesQuery += ' AND DATE(createdAt) <= ?';
      salesParams.push(endDate);
    }

    salesQuery += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    salesParams.push(limit, offset);

    console.log('🔍 Executing sales query with params:', salesParams);

    const [sales] = await connection.query(salesQuery, salesParams);
    console.log('📦 Found', sales.length, 'sales');

    // Get item counts for each sale
    const purchases = [];
    for (const sale of sales) {
      try {
        const [itemStats] = await connection.query(
          'SELECT COUNT(*) as items_count, COALESCE(SUM(quantity), 0) as total_items FROM saleitems WHERE saleId = ?',
          [sale.sale_id]
        );

        purchases.push({
          sale_id: sale.sale_id,
          total: sale.total,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          paymentType: sale.paymentType,
          voucherCode: sale.voucherCode,
          purchase_date: sale.purchase_date,
          items_count: parseInt(itemStats[0]?.items_count || 0),
          total_items: parseInt(itemStats[0]?.total_items || 0)
        });
      } catch (itemErr) {
        console.error('Error getting item stats for sale', sale.sale_id, ':', itemErr);
        // Continue with zero counts if item query fails
        purchases.push({
          ...sale,
          items_count: 0,
          total_items: 0
        });
      }
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM sales WHERE cashierId = ?';
    const countParams = [userId];

    if (startDate) {
      countQuery += ' AND DATE(createdAt) >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ' AND DATE(createdAt) <= ?';
      countParams.push(endDate);
    }

    const [countResult] = await connection.query(countQuery, countParams);
    const totalPurchases = countResult[0].total;

    // Get purchase statistics
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_spent,
        COALESCE(AVG(total), 0) as average_order,
        COALESCE(SUM(discount), 0) as total_savings,
        MIN(createdAt) as first_purchase,
        MAX(createdAt) as last_purchase
      FROM sales 
      WHERE cashierId = ?
    `, [userId]);

    console.log('✅ Purchase history retrieved successfully');

    const response = {
      user: user[0],
      purchases: purchases,
      pagination: {
        total: totalPurchases,
        limit: limit,
        offset: offset,
        hasMore: offset + purchases.length < totalPurchases
      },
      statistics: stats[0] || {
        total_orders: 0,
        total_spent: 0,
        average_order: 0,
        total_savings: 0,
        first_purchase: null,
        last_purchase: null
      }
    };

    return NextResponse.json(response);

  } catch (e) {
    console.error('❌ GET /api/users/[id]/purchases error:', e.message);
    console.error('Stack trace:', e.stack);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: e.message,
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
    
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Database connection released');
    }
  }
}