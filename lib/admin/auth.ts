// Sessão do painel: cookie com HMAC da senha (Web Crypto, funciona no middleware).
export const ADMIN_COOKIE = "joao_admin";
export const ADMIN_MAX_AGE = 7 * 24 * 3600;

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sessionToken(password: string): Promise<string> {
  return hmac(password, "joao-da-obra-admin-v1");
}

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !cookie) return false;
  const expected = await sessionToken(password);
  if (cookie.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < cookie.length; i++) diff |= cookie.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
