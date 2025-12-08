import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET all vouchers with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const type = searchParams.get('type');
    const code = searchParams.get('code');
    const minAmount = searchParams.get('minAmount');

    const db = mysqlPool;
    let query = 'SELECT * FROM vouchers WHERE 1=1';
    const params = [];

    // Filter active/expired vouchers
    if (active === 'true') {
      query += ' AND (expiresAt IS NULL OR expiresAt >= NOW())';
    } else if (active === 'false') {
      query += ' AND expiresAt < NOW()';
    }

    // Filter by type
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    // Search by code
    if (code) {
      query += ' AND code LIKE ?';
      params.push(`%${code}%`);
    }

    // Filter by minimum amount
    if (minAmount) {
      query += ' AND amount >= ?';
      params.push(parseFloat(minAmount));
    }

    query += ' ORDER BY createdAt DESC';

    const [rows] = await db.query(query, params);

    // Add status to each voucher
    const vouchersWithStatus = rows.map(voucher => ({
      ...voucher,
      status: voucher.expiresAt && new Date(voucher.expiresAt) < new Date() 
        ? 'expired' 
        : 'active'
    }));

    return NextResponse.json(vouchersWithStatus);
  } catch (e) {
    console.error('GET /api/vouchers error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST create voucher
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, type, amount, minTotal, expiresAt } = body;

    // Validation
    if (!code || code.trim() === '') {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400 }
      );
    }

    if (!type || !['percentage', 'fixed'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "percentage" or "fixed"' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate percentage
    if (type === 'percentage' && amount > 100) {
      return NextResponse.json(
        { error: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      );
    }

    // Validate minimum total
    if (minTotal !== undefined && minTotal < 0) {
      return NextResponse.json(
        { error: 'Minimum total cannot be negative' },
        { status: 400 }
      );
    }

    // Validate expiration date
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiration date format' },
          { status: 400 }
        );
      }
      if (expDate < new Date()) {
        return NextResponse.json(
          { error: 'Expiration date cannot be in the past' },
          { status: 400 }
        );
      }
    }

    const db = mysqlPool;

    // Check if voucher code already exists
    const [existing] = await db.query(
      'SELECT id FROM vouchers WHERE code = ?',
      [code.trim().toUpperCase()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Voucher code already exists' },
        { status: 409 }
      );
    }

    // Insert voucher
    const [result] = await db.query(
      `INSERT INTO vouchers (code, type, amount, minTotal, expiresAt)
       VALUES (?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        type,
        amount,
        minTotal || null,
        expiresAt || null
      ]
    );

    const [rows] = await db.query(
      'SELECT * FROM vouchers WHERE id = ?',
      [result.insertId]
    );

    console.log('✅ Voucher created:', rows[0].code);

    return NextResponse.json({
      ...rows[0],
      status: 'active'
    }, { status: 201 });
  } catch (e) {
    console.error('❌ POST /api/vouchers error:', e);
    
    // Handle duplicate key error
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Voucher code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT bulk update vouchers
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, code, type, amount, minTotal, expiresAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Voucher ID is required' },
        { status: 400 }
      );
    }

    const db = mysqlPool;

    // Check if voucher exists
    const [existing] = await db.query(
      'SELECT * FROM vouchers WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (code !== undefined) {
      // Check if new code already exists (excluding current voucher)
      const [duplicate] = await db.query(
        'SELECT id FROM vouchers WHERE code = ? AND id != ?',
        [code.trim().toUpperCase(), id]
      );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: 'Voucher code already exists' },
          { status: 409 }
        );
      }

      updates.push('code = ?');
      params.push(code.trim().toUpperCase());
    }

    if (type !== undefined) {
      if (!['percentage', 'fixed'].includes(type)) {
        return NextResponse.json(
          { error: 'Type must be either "percentage" or "fixed"' },
          { status: 400 }
        );
      }
      updates.push('type = ?');
      params.push(type);
    }

    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        );
      }
      if (type === 'percentage' && amount > 100) {
        return NextResponse.json(
          { error: 'Percentage discount cannot exceed 100%' },
          { status: 400 }
        );
      }
      updates.push('amount = ?');
      params.push(amount);
    }

    if (minTotal !== undefined) {
      updates.push('minTotal = ?');
      params.push(minTotal);
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updates.push('expiresAt = NULL');
      } else {
        const expDate = new Date(expiresAt);
        if (isNaN(expDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid expiration date format' },
            { status: 400 }
          );
        }
        updates.push('expiresAt = ?');
        params.push(expiresAt);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updatedAt
    updates.push('updatedAt = CURRENT_TIMESTAMP(3)');
    params.push(id);

    await db.query(
      `UPDATE vouchers SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await db.query(
      'SELECT * FROM vouchers WHERE id = ?',
      [id]
    );

    console.log('✅ Voucher updated:', updated[0].code);

    return NextResponse.json({
      ...updated[0],
      status: updated[0].expiresAt && new Date(updated[0].expiresAt) < new Date()
        ? 'expired'
        : 'active'
    });
  } catch (e) {
    console.error('❌ PUT /api/vouchers error:', e);
    
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Voucher code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE voucher
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Voucher ID is required' },
        { status: 400 }
      );
    }

    const db = mysqlPool;

    // Check if voucher exists
    const [existing] = await db.query(
      'SELECT * FROM vouchers WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      );
    }

    // Check if voucher is being used in any sales
    const [usageCount] = await db.query(
      'SELECT COUNT(*) as count FROM sales WHERE voucherCode = ?',
      [existing[0].code]
    );

    const isUsed = usageCount[0].count > 0;

    try {
      await db.query('DELETE FROM vouchers WHERE id = ?', [id]);
      
      console.log(`🗑️ Voucher ${existing[0].code} deleted`);

      return NextResponse.json({
        message: 'Voucher deleted successfully',
        code: existing[0].code,
        wasUsed: isUsed,
        usageCount: usageCount[0].count
      });
    } catch (err) {
      // If foreign key constraint fails
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return NextResponse.json({
          error: 'Cannot delete voucher as it is referenced in existing sales',
          usageCount: usageCount[0].count,
          suggestion: 'Consider expiring the voucher instead of deleting it'
        }, { status: 409 });
      }
      throw err;
    }
  } catch (e) {
    console.error('❌ DELETE /api/vouchers error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}