// app/api/users/[id]/password/route.js
import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";
import bcrypt from "bcryptjs";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { currentPassword, newPassword } = await req.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Get user with current password
    const [users] = await mysqlPool.query(
      `SELECT id, password FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = users[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await mysqlPool.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedNewPassword, id]
    );

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );

  } catch (err) {
    console.error("PASSWORD UPDATE ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
