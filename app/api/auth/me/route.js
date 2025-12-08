import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { mysqlPool } from "@/utils/db";

export async function GET(req) {
  try {
    console.log('🔍 /api/auth/me - Getting current user');

    // Try multiple ways to get the token
    const token = req.cookies.get("token")?.value;
    
    // Debug cookie information
    console.log('🍪 All cookies:', req.cookies.getAll());
    console.log('🍪 Token cookie:', {
      exists: !!token,
      value: token ? token.substring(0, 20) + '...' : 'null'
    });

    if (!token) {
      console.log('❌ No token found in cookies');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded:', { userId: decoded.userId });
    } catch (err) {
      console.error('❌ Token verification failed:', err.message);
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.error('❌ No userId in token');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    console.log('🔍 Querying user from database, userId:', userId);

    const [rows] = await mysqlPool.query(
      "SELECT id, name, email, role, points, createdAt, updatedAt FROM users WHERE id = ?",
      [userId]
    );

    console.log('📊 Query result:', rows.length > 0 ? 'User found' : 'User not found');

    if (rows.length === 0) {
      console.log('❌ User not found in database');
      return NextResponse.json({ user: null }, { status: 404 });
    }

    const user = rows[0];

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      points: user.points ?? 0,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
    };

    console.log('✅ Returning user data');

    return NextResponse.json({ user: userData }, { status: 200 });

  } catch (err) {
    console.error("❌ ME API ERROR:", err);
    return NextResponse.json(
      { user: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
