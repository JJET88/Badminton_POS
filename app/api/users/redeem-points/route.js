// app/api/users/redeem-points/route.js
import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

export async function POST(request) {
  try {
    const { userId, pointsToRedeem } = await request.json();

    console.log('🎟️ Redeem points request:', { userId, pointsToRedeem });

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return NextResponse.json(
        { error: "Invalid points amount" },
        { status: 400 }
      );
    }

    const points = parseInt(pointsToRedeem);

    // Get current user
    const [userRows] = await mysqlPool.query(
      'SELECT id, name, email, role, points FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const currentPoints = userRows[0].points || 0;

    // Check if user has enough points
    if (currentPoints < points) {
      return NextResponse.json(
        { 
          error: `Insufficient points. You have ${currentPoints} points but tried to redeem ${points}` 
        },
        { status: 400 }
      );
    }

    const newPoints = currentPoints - points;
    const discountAmount = points / 10; // 10 points = $1

    console.log('📊 Redemption calculation:', {
      current: currentPoints,
      redeeming: points,
      new: newPoints,
      discount: discountAmount
    });

    // Deduct points
    await mysqlPool.query(
      'UPDATE users SET points = ? WHERE id = ?',
      [newPoints, userId]
    );

    // Fetch updated user
    const [updatedRows] = await mysqlPool.query(
      'SELECT id, name, email, role, points FROM users WHERE id = ?',
      [userId]
    );

    console.log('✅ Points redeemed:', {
      user: updatedRows[0].email,
      oldPoints: currentPoints,
      newPoints: updatedRows[0].points,
      discount: `$${discountAmount}`
    });

    return NextResponse.json({
      success: true,
      message: `Redeemed ${points} points for $${discountAmount.toFixed(2)} discount`,
      user: updatedRows[0],
      previousPoints: currentPoints,
      redeemedPoints: points,
      newPoints: updatedRows[0].points,
      discountAmount: discountAmount
    });

  } catch (error) {
    console.error('❌ Redeem points error:', error);
    return NextResponse.json(
      { error: error.message || "Failed to redeem points" },
      { status: 500 }
    );
  }
}