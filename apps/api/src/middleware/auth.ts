import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Authentik OIDC configuration — loaded from env at startup
const OIDC_ISSUER = process.env.OIDC_ISSUER;
const OIDC_AUDIENCE = process.env.OIDC_AUDIENCE;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!OIDC_ISSUER) throw new Error("OIDC_ISSUER is not set");
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${OIDC_ISSUER}/application/o/groombook/jwks/`)
    );
  }
  return jwks;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
}

// Guard: refuse to start with AUTH_DISABLED in production (fixes #22).
if (process.env.AUTH_DISABLED === "true") {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[FATAL] AUTH_DISABLED=true is not allowed in production. " +
        "Remove AUTH_DISABLED from your environment and configure OIDC_ISSUER."
    );
    process.exit(1);
  }
  console.warn(
    "[WARNING] AUTH_DISABLED=true — authentication is bypassed. " +
      "Do NOT use this in production."
  );
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  if (process.env.AUTH_DISABLED === "true") {
    const devUserId = c.req.header("X-Dev-User-Id");
    const sub = devUserId ?? "dev-user";
    c.set("jwtPayload", { sub } as JwtPayload);
    await next();
    return;
  }

  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authorization.slice(7);

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: OIDC_ISSUER,
      audience: OIDC_AUDIENCE,
    });

    c.set("jwtPayload", payload as JwtPayload);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};
