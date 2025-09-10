import { createRemoteJWKSet, jwtVerify } from "jose";

// Validates Supabase Auth JWTs (issued by your project)
const JWKS = createRemoteJWKSet(new URL("https://api.supabase.com/auth/v1/jwks"));

export async function verifyAuth(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    const sub = payload.sub as string | undefined;
    const email = (payload.email as string) || undefined;
    if (!sub) return null;
    return { user_id: sub, email };
  } catch { return null; }
}
