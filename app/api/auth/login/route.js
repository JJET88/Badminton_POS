import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";
import bcrypt from "bcryptjs";

export async function POST(request) {
  let connection;
  
  try {
    const { email, password } = await request.json();

    console.log('🔐 Login attempt for:', email);

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Get connection
    connection = await mysqlPool.getConnection();
    console.log('✅ Database connection established');

    // Find user by email
    const [rows] = await connection.query(
      'SELECT id, name, email, password, role, points FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    console.log('📊 Query result:', {
      found: rows.length > 0,
      email: email,
    });

    if (rows.length === 0) {
      console.log('❌ User not found');
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = rows[0];
    console.log('👤 User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });

    // Verify password
    let isPasswordValid = false;
    
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('🔑 Password verification:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
    } catch (bcryptError) {
      console.error('❌ Bcrypt comparison error:', bcryptError);
      return NextResponse.json(
        { error: "Password verification failed" },
        { status: 500 }
      );
    }

    if (!isPasswordValid) {
      console.log('❌ Password mismatch');
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Successful login - return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      points: user.points || 0
    };

    console.log('✅ Login successful:', userData);

    // Store user in session/cookie if needed
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: userData
    });

    return response;

  } catch (err) {
    console.error('❌ Login error:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    return NextResponse.json(
      { 
        error: "Login failed", 
        details: process.env.NODE_ENV === 'development' ? err.message : undefined 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Connection released');
    }
  }
}