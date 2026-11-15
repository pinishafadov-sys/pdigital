import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt (memory-hard, built into Node) - same security class as bcrypt/argon2,
// with no native dependency. Format: scrypt$N$r$p$salt$hash (base64url).
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, keylen, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const cost = Number(n);
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length, {
    N: cost,
    r: Number(r),
    p: Number(p),
    maxmem: 128 * cost * Number(r) * 2,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Used when the username does not exist, so response time doesn't reveal it.
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("not-a-real-password");
  await verifyPassword(password, await dummyHash);
}

/** Returns an error message in Hebrew, or null when the password is acceptable. */
export function passwordPolicyError(password: string, username: string): string | null {
  if (password.length < 10) return "הסיסמה חייבת להכיל לפחות 10 תווים";
  if (password.length > 200) return "הסיסמה ארוכה מדי";
  if (!/[a-zA-Zא-ת]/.test(password) || !/\d/.test(password))
    return "הסיסמה חייבת להכיל גם אותיות וגם ספרות";
  const lower = password.toLowerCase();
  if (lower.includes(username.toLowerCase()) || /^(admin|password|123456|qwerty|pdigital)/.test(lower))
    return "הסיסמה פשוטה מדי או מכילה את שם המשתמש";
  return null;
}
