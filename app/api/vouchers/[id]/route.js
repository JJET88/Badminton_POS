import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET voucher by ID with usage statistics
export async function GET(req, { params }) {
  try {
    // FIX: Await params first
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid voucher ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const includeUsage = searchParams.get('includeUsage') === 'true';

    const db = mysqlPool;

    const [rows] = await db.query('SELECT * FROM vouchers WHERE id = ?', [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const voucher = rows[0];

    // Add status
    const status = voucher.expiresAt && new Date(voucher.expiresAt) < new Date()
      ? 'expired'
      : 'active';

    const response = {
      ...voucher,
      status
    };

    // Include usage statistics if requested
    if (includeUsage) {
      const [usageStats] = await db.query(
        `SELECT 
          COUNT(*) as totalUses,
          SUM(total) as totalRevenue,
          SUM(discount) as totalDiscountGiven,
          MIN(createdAt) as firstUsed,
          MAX(createdAt) as lastUsed
         FROM sales 
         WHERE voucherCode = ?`,
        [voucher.code]
      );

      response.usage = {
        totalUses: usageStats[0].totalUses || 0,
        totalRevenue: usageStats[0].totalRevenue || 0,
        totalDiscountGiven: usageStats[0].totalDiscountGiven || 0,
        firstUsed: usageStats[0].firstUsed,
        lastUsed: usageStats[0].lastUsed
      };
    }

    return NextResponse.json(response);
  } catch (e) {
    console.error('GET /api/vouchers/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT update voucher
export async function PUT(request, { params }) {
  try {
    // FIX: Await params first
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid voucher ID" }, { status: 400 });
    }

    const body = await request.json();

    console.log('📝 PUT /api/vouchers/[id] called:', { id, body });

    const db = mysqlPool;

    // Check if voucher exists
    const [exists] = await db.query('SELECT * FROM vouchers WHERE id = ?', [id]);

    if (exists.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Allowed fields for update
    const allowedFields = ['code', 'type', 'amount', 'minTotal', 'expiresAt'];
    const updates = [];
    const updateParams = [];

    // Build dynamic update query with validation
    for (const [key, val] of Object.entries(body)) {
      if (allowedFields.includes(key) && val !== undefined) {
        // Validate code
        if (key === 'code') {
          if (!val || val.trim() === '') {
            return NextResponse.json(
              { error: 'Code cannot be empty' },
              { status: 400 }
            );
          }

          // Check if new code already exists (excluding current voucher)
          const [duplicate] = await db.query(
            'SELECT id FROM vouchers WHERE code = ? AND id != ?',
            [val.trim().toUpperCase(), id]
          );

          if (duplicate.length > 0) {
            return NextResponse.json(
              { error: 'Voucher code already exists' },
              { status: 409 }
            );
          }

          updates.push('code = ?');
          updateParams.push(val.trim().toUpperCase());
        }
        // Validate type
        else if (key === 'type') {
          if (!['percentage', 'fixed'].includes(val)) {
            return NextResponse.json(
              { error: 'Type must be either "percentage" or "fixed"' },
              { status: 400 }
            );
          }
          updates.push('type = ?');
          updateParams.push(val);
        }
        // Validate amount
        else if (key === 'amount') {
          if (val <= 0) {
            return NextResponse.json(
              { error: 'Amount must be greater than 0' },
              { status: 400 }
            );
          }
          
          // Get current type or use provided type
          const currentType = body.type || exists[0].type;
          if (currentType === 'percentage' && val > 100) {
            return NextResponse.json(
              { error: 'Percentage discount cannot exceed 100%' },
              { status: 400 }
            );
          }
          updates.push('amount = ?');
          updateParams.push(val);
        }
        // Validate minTotal
        else if (key === 'minTotal') {
          if (val !== null && val < 0) {
            return NextResponse.json(
              { error: 'Minimum total cannot be negative' },
              { status: 400 }
            );
          }
          updates.push('minTotal = ?');
          updateParams.push(val);
        }
        // Validate expiresAt
        else if (key === 'expiresAt') {
          if (val === null) {
            updates.push('expiresAt = NULL');
          } else {
            const expDate = new Date(val);
            if (isNaN(expDate.getTime())) {
              return NextResponse.json(
                { error: 'Invalid expiration date format' },
                { status: 400 }
              );
            }
            updates.push('expiresAt = ?');
            updateParams.push(val);
          }
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updatedAt
    updates.push('updatedAt = CURRENT_TIMESTAMP(3)');
    updateParams.push(id);

    const sql = `UPDATE vouchers SET ${updates.join(', ')} WHERE id = ?`;
    console.log('🔧 Executing SQL:', sql);
    console.log('🔧 With params:', updateParams);

    await db.query(sql, updateParams);

    // Fetch updated voucher
    const [updated] = await db.query('SELECT * FROM vouchers WHERE id = ?', [id]);

    console.log('✅ Voucher updated:', updated[0].code);

    const status = updated[0].expiresAt && new Date(updated[0].expiresAt) < new Date()
      ? 'expired'
      : 'active';

    return NextResponse.json({
      ...updated[0],
      status
    });
  } catch (e) {
    console.error('❌ PUT /api/vouchers/[id] error:', e);
    
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
export async function DELETE(req, { params }) {
  try {
    // FIX: Await params first
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid voucher ID" }, { status: 400 });
    }

    const db = mysqlPool;

    // Check if voucher exists
    const [exists] = await db.query('SELECT * FROM vouchers WHERE id = ?', [id]);

    if (exists.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const voucherCode = exists[0].code;

    // Check if voucher is being used in any sales
    const [usageCount] = await db.query(
      'SELECT COUNT(*) as count FROM sales WHERE voucherCode = ?',
      [voucherCode]
    );

    const isUsed = usageCount[0].count > 0;

    try {
      await db.query('DELETE FROM vouchers WHERE id = ?', [id]);
      
      console.log(`🗑️ Voucher ${voucherCode} deleted`);

      return NextResponse.json({
        message: 'Voucher deleted successfully',
        code: voucherCode,
        wasUsed: isUsed,
        usageCount: usageCount[0].count
      });
    } catch (err) {
      // If foreign key constraint fails
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return NextResponse.json({
          error: 'Cannot delete voucher as it is referenced in existing sales',
          usageCount: usageCount[0].count,
          suggestion: 'Consider expiring the voucher instead by setting expiresAt to a past date'
        }, { status: 409 });
      }
      throw err;
    }
  } catch (e) {
    console.error('❌ DELETE /api/vouchers/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH - Expire or activate voucher (convenience method)
export async function PATCH(request, { params }) {
  try {
    // FIX: Await params first
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid voucher ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    console.log('🔧 PATCH /api/vouchers/[id] called:', { id, action });

    const db = mysqlPool;

    // Check if voucher exists
    const [exists] = await db.query('SELECT * FROM vouchers WHERE id = ?', [id]);

    if (exists.length === 0) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (action === 'expire') {
      // Set expiration to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await db.query(
        'UPDATE vouchers SET expiresAt = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [yesterday.toISOString().split('T')[0], id]
      );

      console.log(`⏰ Voucher ${exists[0].code} expired`);

    } else if (action === 'activate') {
      // Set expiration to null (never expires) or future date
      const expiresAt = body.expiresAt || null;
      
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
            { error: 'Expiration date must be in the future' },
            { status: 400 }
          );
        }
      }

      await db.query(
        'UPDATE vouchers SET expiresAt = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [expiresAt, id]
      );

      console.log(`✅ Voucher ${exists[0].code} activated`);

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "expire" or "activate"' },
        { status: 400 }
      );
    }

    // Fetch updated voucher
    const [updated] = await db.query('SELECT * FROM vouchers WHERE id = ?', [id]);

    const status = updated[0].expiresAt && new Date(updated[0].expiresAt) < new Date()
      ? 'expired'
      : 'active';

    return NextResponse.json({
      ...updated[0],
      status,
      message: `Voucher ${action === 'expire' ? 'expired' : 'activated'} successfully`
    });
  } catch (e) {
    console.error('❌ PATCH /api/vouchers/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}