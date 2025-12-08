import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mysqlPool } from "@/utils/db";

export async function POST(request) {
  try {
    console.log('🔐 Login attempt started');
    
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const [users] = await mysqlPool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      points: user.points || 0,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
    };

    const response = NextResponse.json(
      { 
        success: true,
        user: userData,
        message: 'Login successful'
      },
      { status: 200 }
    );

    // CRITICAL: Cookie settings for Vercel
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Get the domain from request headers
    const host = request.headers.get('host');
    const domain = host ? host.split(':')[0] : undefined;
    
    console.log('Setting cookie with domain:', domain);
    
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // CRITICAL: Use 'lax' not 'strict'
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      // Don't set domain for Vercel - let it default
    });

    console.log('✅ Login successful! Cookie set with settings:', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: '7 days'
    });

    return response;

  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}