import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export default function proxy(req) {
  const token = req.cookies.get("token")?.value;

  // No token
  if (!token) {
    if (
      req.nextUrl.pathname.startsWith("/admin") ||
      req.nextUrl.pathname.startsWith("/user")
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // decode role
  const decoded = jwt.decode(token);

  if (
    req.nextUrl.pathname.startsWith("/admin") &&
    decoded.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/user", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
