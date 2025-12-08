import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { mysqlPool } from "@/utils/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    console.log('📥 Register request received:', { name, email, role, hasPassword: !!password });

    // Validation
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields: name, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['user', 'admin'];
    const userRole = role || 'user';
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'user' or 'admin'" },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed');

    // Check database connection
    try {
      await mysqlPool.query('SELECT 1');
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json(
        { error: "Database connection failed. Please try again later." },
        { status: 500 }
      );
    }

    // Check if email exists
    console.log('🔍 Checking if email exists...');
    const [rows] = await mysqlPool.query(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase()]
    );

    if (rows.length > 0) {
      console.log('❌ Email already exists');
      return NextResponse.json(
        { error: "Email already exists. Please use a different email or login." },
        { status: 409 }
      );
    }

    console.log('✅ Email is available');

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully');

    // Insert user
    console.log('💾 Inserting user into database...');
    const [result] = await mysqlPool.query(
      "INSERT INTO users (name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [name.trim(), email.toLowerCase(), hashedPassword, userRole]
    );

    console.log('✅ User registered successfully:', { 
      id: result.insertId, 
      name: name.trim(), 
      email: email.toLowerCase(),
      role: userRole 
    });

    return NextResponse.json({ 
      message: "User registered successfully",
      user: {
        id: result.insertId,
        name: name.trim(),
        email: email.toLowerCase(),
        role: userRole
      }
    }, { status: 201 });

  } catch (err) {
    console.error("❌ Register error:", err);
    
    // Handle specific MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    if (err.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json(
        { error: "Database table not found. Please contact administrator." },
        { status: 500 }
      );
    }

    if (err.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: "Cannot connect to database. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}