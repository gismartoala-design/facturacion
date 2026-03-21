import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "arg_session";
const DEFAULT_FEATURES = ["BILLING", "QUOTES"];

// Rutas públicas: no requieren autenticación
const PUBLIC_PREFIXES = [
  "/login",
  "/api/v1/auth/login",
  "/api/v1/auth/seed",
  "/_next",
  "/favicon.ico",
  "/logo-original.jpg",
  "/logo/logo-intuit.jpg",
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
    const { payload } = await jwtVerify(token, new TextEncoder().encode(rawSecret));
    const rawFeatures = Array.isArray(payload.features)
      ? payload.features.filter((feature): feature is string => typeof feature === "string")
      : DEFAULT_FEATURES;
    const features = rawFeatures.length > 0 ? rawFeatures : DEFAULT_FEATURES;

    if (pathname.startsWith("/sri") && !features.includes("BILLING")) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    if (pathname.startsWith("/quotes") && !features.includes("QUOTES")) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    if (pathname.startsWith("/pos") && !features.includes("POS")) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    if (pathname.startsWith("/api/v1/sri-invoices") && !features.includes("BILLING")) {
      return NextResponse.json({
        success: false,
        error: { message: "Modulo billing no habilitado para este negocio" },
      }, { status: 403 });
    }

    if (pathname.startsWith("/api/v1/quotes") && !features.includes("QUOTES")) {
      return NextResponse.json({
        success: false,
        error: { message: "Modulo quotes no habilitado para este negocio" },
      }, { status: 403 });
    }

    if (pathname.startsWith("/api/v1/pos") && !features.includes("POS")) {
      return NextResponse.json({
        success: false,
        error: { message: "Modulo POS no habilitado para este negocio" },
      }, { status: 403 });
    }

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
