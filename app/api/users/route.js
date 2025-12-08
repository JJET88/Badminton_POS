import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";
import bcrypt from "bcryptjs";

// GET all users with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    let query = 'SELECT id, name, email, role, points, created_at FROM users WHERE 1=1';
    const params = [];

    // Filter by role
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    // Search by name or email
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await mysqlPool.query(query, params);
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/users error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST create user (REGISTER)
export async function POST(request) {
  try {
    const { name, email, role, password } = await request.json();

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!email || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (!role || !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or user' },
        { status: 400 }
      );
    }

    // Check duplicate email
    const [existing] = await mysqlPool.query(
      'SELECT email FROM users WHERE email = ?',
      [email.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert user with default points
    const [result] = await mysqlPool.query(
      `INSERT INTO users (name, email, role, password, points)
       VALUES (?, ?, ?, ?, 0)`,
      [name.trim(), email.trim(), role, hashed]
    );

    // Fetch created user
    const [rows] = await mysqlPool.query(
      'SELECT id, name, email, role, points, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    console.log('✅ User created:', rows[0].email);

    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    console.error('❌ POST /api/users error:', e);
    
    // Handle duplicate key error
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT update user
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, email, role, password, points } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [existing] = await mysqlPool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (name.trim() === '') {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check if new email already exists (excluding current user)
      const [duplicate] = await mysqlPool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim(), id]
      );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }

      updates.push('email = ?');
      params.push(email.trim());
    }

    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be admin or user' },
          { status: 400 }
        );
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (points !== undefined) {
      if (points < 0) {
        return NextResponse.json(
          { error: 'Points cannot be negative' },
          { status: 400 }
        );
      }
      updates.push('points = ?');
      params.push(points);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(id);

    await mysqlPool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Fetch updated user
    const [updated] = await mysqlPool.query(
      'SELECT id, name, email, role, points, created_at FROM users WHERE id = ?',
      [id]
    );

    console.log('✅ User updated:', updated[0].email);

    return NextResponse.json(updated[0]);
  } catch (e) {
    console.error('❌ PUT /api/users error:', e);
    
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE user (permanent deletion)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [existing] = await mysqlPool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has sales (as cashier)
    const [salesCount] = await mysqlPool.query(
      'SELECT COUNT(*) as count FROM sales WHERE cashierId = ?',
      [id]
    );

    if (salesCount[0].count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete user with existing sales records (${salesCount[0].count} sales)`,
          code: 'HAS_SALES_HISTORY',
          salesCount: salesCount[0].count,
          userName: existing[0].name,
          suggestion: 'This user has sales history and cannot be deleted to maintain data integrity'
        },
        { status: 409 }
      );
    }

    // Permanent delete (only if no sales)
    try {
      await mysqlPool.query('DELETE FROM users WHERE id = ?', [id]);
      
      console.log(`🗑️ User deleted: ${existing[0].email}`);
      
      return NextResponse.json({
        message: 'User deleted successfully',
        userName: existing[0].name,
        email: existing[0].email
      });
    } catch (err) {
      // Foreign key constraint error (backup check)
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return NextResponse.json(
          {
            error: 'Cannot delete user with existing sales records',
            code: 'HAS_SALES_HISTORY',
            suggestion: 'This user has sales history and cannot be deleted to maintain data integrity'
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e) {
    console.error('❌ DELETE /api/users error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}