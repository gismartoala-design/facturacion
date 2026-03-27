import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { MODULE_KEYS, type ModuleKey } from "@/core/platform/contracts";

export const SESSION_COOKIE = "arg_session";
const JWT_ALG = "HS256";
const JWT_TTL_SECONDS = 60 * 60 * 8; // 8 horas
const DEFAULT_SESSION_FEATURES = ["BILLING", "QUOTES"] as const satisfies readonly ModuleKey[];

export type SessionFeatureKey = ModuleKey;

export type SessionPayload = {
  sub: string;
  businessId: string;
  businessName: string;
  name: string;
  email: string;
  role: "ADMIN" | "SELLER";
  features: SessionFeatureKey[];
};

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no configurado en variables de entorno");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "SELLER")
    ) {
      return null;
    }

    const features = Array.isArray(payload.features)
      ? payload.features.filter(
          (feature): feature is SessionFeatureKey =>
            typeof feature === "string" &&
            MODULE_KEYS.includes(feature as ModuleKey),
        )
      : [...DEFAULT_SESSION_FEATURES];

    return {
      sub: payload.sub,
      businessId: typeof payload.businessId === "string" ? payload.businessId : "",
      businessName: typeof payload.businessName === "string" ? payload.businessName : "Negocio Principal",
      name: payload.name,
      email: payload.email,
      role: payload.role,
      features: features.length > 0 ? features : [...DEFAULT_SESSION_FEATURES],
    };
  } catch {
    return null;
  }
}

/** Solo disponible en Server Components y Route Handlers (no en middleware). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions(maxAge = JWT_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}
