import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "arg_session";

// Rutas públicas: no requieren autenticación
const PUBLIC_PREFIXES = [
  "/login",
  "/api/v1/auth/login",
  "/api/v1/auth/seed",
  "/_next",
  "/favicon.ico",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const rawSecret = process.env.JWT_SECRET;

  if (!token || !rawSecret) {
    return redirectToLogin(request);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(rawSecret));
    return NextResponse.next();
  } catch {
    const response = redirectToLogin(request);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|public/).*)"],
};
