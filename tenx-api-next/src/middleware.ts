import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getCorsHeaders(request: NextRequest) {
  const allowedOrigins = (
    process.env.CORS_ORIGIN || "https://new.10xdigitalventures.com"
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const origin = request.headers.get("origin") || "";
  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "false",
    Vary: "Origin",
  };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

  if (!secret) {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET is missing");
  }

  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    return {
      userId: String(payload.userId || payload.sub || ""),
      role: String(payload.role || ""),
    };
  } catch (error) {
    console.error("JWT verify failed in middleware:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const publicRoutes = [
    "/api/health",
    "/api/auth/register",
    "/api/auth/login/step1",
    "/api/auth/login/step2",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/verify-reset-token",
    "/api/auth/reset-password",
    "/api/user/consultants",
  ];

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const token = authHeader.split(" ")[1];
  const payload = await verifyToken(token);

  if (!payload || !payload.userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const role = String(payload.role || "").toLowerCase();

  if (pathname.startsWith("/api/admin") && !role.includes("admin")) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403, headers: corsHeaders },
    );
  }

  if (
    pathname.startsWith("/api/consultant") &&
    !(role.includes("consultant") || role.includes("admin"))
  ) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403, headers: corsHeaders },
    );
  }

  if (
    pathname.startsWith("/api/user") &&
    !(
      role.includes("user") ||
      role.includes("client") ||
      role.includes("admin") ||
      role.includes("consultant")
    )
  ) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403, headers: corsHeaders },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role || "");

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
