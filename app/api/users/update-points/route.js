import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

export async function POST(req) {
  try {
    const { userId, pointsToAdd } = await req.json();

    if (!userId || pointsToAdd === undefined) {
      return NextResponse.json(
        { error: "userId and pointsToAdd are required" },
        { status: 400 }
      );
    }

    // Get current user points
    const [rows] = await mysqlPool.query(
      "SELECT points FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const currentPoints = rows[0].points || 0;
    const newPoints = currentPoints + pointsToAdd;

    // Update user points
    await mysqlPool.query(
      "UPDATE users SET points = ? WHERE id = ?",
      [newPoints, userId]
    );

    return NextResponse.json({
      success: true,
      message: `Added ${pointsToAdd} points`,
      newPoints,
      previousPoints: currentPoints,
    });

  } catch (err) {
    console.error("ADD POINTS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to add points" },
      { status: 500 }
    );
  }
}