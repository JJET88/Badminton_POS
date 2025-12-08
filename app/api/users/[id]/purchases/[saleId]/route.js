import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET specific purchase details for a user
export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = parseInt(resolvedParams.id);
    const saleId = parseInt(resolvedParams.saleId);

    if (isNaN(userId) || isNaN(saleId)) {
      return NextResponse.json({ error: "Invalid user ID or sale ID" }, { status: 400 });
    }

    const db = mysqlPool;

    // Get complete sale details with authorization check
    const [rows] = await db.query(`
      SELECT 
        s.id as sale_id,
        s.total,
        s.subtotal,
        s.tax,
        s.discount,
        s.paymentType,
        s.voucherCode,
        s.createdAt as purchase_date,
        s.cashierId,
        u.name as cashier_name,
        u.email as cashier_email,
        si.id as item_id,
        si.quantity,
        si.price as unit_price,
        si.quantity * si.price as line_total,
        p.id as product_id,
        p.title as product_name,
        p.category,
        p.image as product_image
      FROM sales s
      LEFT JOIN users u ON s.cashierId = u.id
      LEFT JOIN saleitems si ON s.id = si.saleId
      LEFT JOIN products p ON si.productId = p.id
      WHERE s.id = ? AND s.cashierId = ?
    `, [saleId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ 
        error: "Purchase not found or does not belong to this user" 
      }, { status: 404 });
    }

    // Organize the response
    const purchase = {
      id: rows[0].sale_id,
      total: rows[0].total,
      subtotal: rows[0].subtotal,
      tax: rows[0].tax,
      discount: rows[0].discount,
      paymentType: rows[0].paymentType,
      voucherCode: rows[0].voucherCode,
      purchaseDate: rows[0].purchase_date,
      cashier: {
        id: rows[0].cashierId,
        name: rows[0].cashier_name,
        email: rows[0].cashier_email
      },
      items: rows.filter(r => r.item_id).map(row => ({
        id: row.item_id,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        lineTotal: row.line_total,
        product: {
          id: row.product_id,
          name: row.product_name,
          category: row.category,
          image: row.product_image
        }
      }))
    };

    return NextResponse.json(purchase);

  } catch (e) {
    console.error('GET /api/users/[id]/purchases/[saleId] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}