// app/api/auth/me/route.js - FIXED FOR VERCEL
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { mysqlPool } from "@/utils/db";

export async function GET(req) {
  try {
    console.log('🔍 /api/auth/me - Getting current user');
    console.log('🍪 All cookies:', req.cookies.getAll());

    const token = req.cookies.get("token")?.value;

    if (!token) {
      console.log('❌ No token found in cookies');
      return NextResponse.json(
        { error: "Not authenticated", user: null }, 
        { status: 401 }
      );
    }

    console.log('✅ Token found:', token.substring(0, 20) + '...');

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
      console.log('✅ Token decoded:', decoded);
    } catch (err) {
      console.error('❌ Token verification failed:', err.message);
      return NextResponse.json(
        { error: "Invalid token", user: null }, 
        { status: 401 }
      );
    }

    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.error('❌ No userId in token');
      return NextResponse.json(
        { error: "Invalid token payload", user: null }, 
        { status: 401 }
      );
    }

    console.log('🔍 Querying user from database, userId:', userId);

    const [rows] = await mysqlPool.query(
      "SELECT id, name, email, role, points, createdAt, updatedAt FROM users WHERE id = ?",
      [userId]
    );

    console.log('📊 Query result:', rows.length > 0 ? 'User found' : 'User not found');

    if (rows.length === 0) {
      console.log('❌ User not found in database');
      return NextResponse.json(
        { error: "User not found", user: null }, 
        { status: 404 }
      );
    }

    const user = rows[0];
    console.log('👤 User data:', { id: user.id, email: user.email, points: user.points });

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      points: user.points ?? 0,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
    };

    console.log('✅ Returning user data with points:', userData.points);

    return NextResponse.json({ user: userData }, { status: 200 });

  } catch (err) {
    console.error("❌ ME API ERROR:", err);
    console.error("Error stack:", err.stack);
    return NextResponse.json(
      { user: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}