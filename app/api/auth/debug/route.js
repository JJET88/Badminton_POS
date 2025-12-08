import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";
import bcrypt from "bcryptjs";

// ⚠️ REMOVE THIS FILE IN PRODUCTION!
// This is only for debugging authentication issues

export async function POST(request) {
  try {
    const { email, action } = await request.json();

    if (action === 'check-user') {
      // Check if user exists
      const [rows] = await mysqlPool.query(
        'SELECT id, email, role, LENGTH(password) as password_length FROM users WHERE email = ?',
        [email]
      );

      if (rows.length === 0) {
        return NextResponse.json({
          status: 'not_found',
          message: 'User does not exist'
        });
      }

      return NextResponse.json({
        status: 'found',
        user: rows[0],
        message: 'User exists in database'
      });
    }

    if (action === 'test-password') {
      const { password } = await request.json();

      // Get user
      const [rows] = await mysqlPool.query(
        'SELECT id, email, password FROM users WHERE email = ?',
        [email]
      );

      if (rows.length === 0) {
        return NextResponse.json({
          status: 'error',
          message: 'User not found'
        });
      }

      const user = rows[0];

      // Test bcrypt comparison
      try {
        const isValid = await bcrypt.compare(password, user.password);
        
        return NextResponse.json({
          status: 'tested',
          passwordMatches: isValid,
          hashedPassword: user.password.substring(0, 20) + '...',
          hashLength: user.password.length,
          hashPrefix: user.password.substring(0, 7)
        });
      } catch (bcryptError) {
        return NextResponse.json({
          status: 'error',
          message: 'Bcrypt comparison failed',
          error: bcryptError.message
        });
      }
    }

    if (action === 'reset-password') {
      const { password } = await request.json();

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user
      await mysqlPool.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );

      return NextResponse.json({
        status: 'success',
        message: 'Password reset successfully',
        newHash: hashedPassword.substring(0, 20) + '...'
      });
    }

    if (action === 'test-connection') {
      const connection = await mysqlPool.getConnection();
      const [result] = await connection.query('SELECT DATABASE() as db, VERSION() as version');
      connection.release();

      return NextResponse.json({
        status: 'connected',
        database: result[0].db,
        version: result[0].version,
        message: 'Database connection successful'
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Invalid action',
      availableActions: ['check-user', 'test-password', 'reset-password', 'test-connection']
    });

  } catch (err) {
    console.error('Debug error:', err);
    return NextResponse.json({
      status: 'error',
      message: err.message,
      code: err.code
    }, { status: 500 });
  }
}

// GET method to test connection
export async function GET() {
  try {
    const connection = await mysqlPool.getConnection();
    const [result] = await connection.query('SELECT DATABASE() as db, VERSION() as version, NOW() as time');
    
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    connection.release();

    return NextResponse.json({
      status: 'ok',
      database: result[0].db,
      version: result[0].version,
      serverTime: result[0].time,
      userCount: userCount[0].count,
      message: 'Database is connected and working'
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: err.message,
      code: err.code
    }, { status: 500 });
  }
}