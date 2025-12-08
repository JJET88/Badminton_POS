import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { mysqlPool } from "@/utils/db";

// GET user by ID
export async function GET(req, { params }) {
  try {
    // FIX: Await params first
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const db = mysqlPool;

    // Select all columns, let the database handle which ones exist
    const [rows] = await db.query(
      'SELECT id, name, email, role, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error('GET /api/users/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT update user
export async function PUT(request, { params }) {
  try {
    // FIX: Await params first
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    console.log('📝 PUT /api/users/[id] called:', { id, name, email, role, hasPassword: !!password });

    const db = mysqlPool;

    // Check if user exists
    const [exists] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

    if (exists.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build dynamic update query
    const updates = [];
    const updateParams = [];

    // Validate and add name
    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Name must be at least 2 characters long' },
          { status: 400 }
        );
      }
      updates.push('name = ?');
      updateParams.push(name.trim());
    }

    // Validate and add email
    if (email !== undefined) {
      if (!email || email.trim() === '') {
        return NextResponse.json(
          { error: 'Email cannot be empty' },
          { status: 400 }
        );
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check if new email already exists (excluding current user)
      const [duplicate] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim().toLowerCase(), id]
      );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }

      updates.push('email = ?');
      updateParams.push(email.trim().toLowerCase());
    }

    // Validate and add password (optional)
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      updateParams.push(hashedPassword);
    }

    // Validate and add role
    if (role !== undefined) {
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be "user" or "admin"' },
          { status: 400 }
        );
      }
      updates.push('role = ?');
      updateParams.push(role);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updatedAt (using camelCase for consistency)
    updates.push('updatedAt = NOW()');
    updateParams.push(id);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    console.log('🔧 Executing SQL:', sql);

    await db.query(sql, updateParams);

    // Fetch updated user
    const [updated] = await db.query(
      'SELECT id, name, email, role, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );

    console.log('✅ User updated:', updated[0].email);

    return NextResponse.json(updated[0]);
  } catch (e) {
    console.error('❌ PUT /api/users/[id] error:', e);
    
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(req, { params }) {
  try {
    // FIX: Await params first
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const db = mysqlPool;

    // Check if user exists
    const [exists] = await db.query('SELECT * FROM users WHERE id = ?', [id]);

    if (exists.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userEmail = exists[0].email;

    // Prevent deleting the last admin
    if (exists[0].role === 'admin') {
      const [adminCount] = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        ['admin']
      );

      if (adminCount[0].count <= 1) {
        return NextResponse.json({
          error: 'Cannot delete the last admin user'
        }, { status: 403 });
      }
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    console.log(`🗑️ User ${userEmail} deleted`);

    return NextResponse.json({
      message: 'User deleted successfully',
      email: userEmail
    });
  } catch (e) {
    console.error('❌ DELETE /api/users/[id] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}