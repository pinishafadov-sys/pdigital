// Small, strict helpers for reading FormData in server actions.
// Every value from the browser is untrusted: trim, cap length, validate types.

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

export class FormError extends Error {}

export function str(fd: FormData, key: string, opts: { max?: number; required?: string } = {}) {
  const raw = fd.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (opts.required && !value) throw new FormError(opts.required);
  if (value.length > (opts.max ?? 500)) throw new FormError(`השדה "${key}" ארוך מדי`);
  return value;
}

export function optStr(fd: FormData, key: string, max = 500) {
  return str(fd, key, { max }) || null;
}

export function int(fd: FormData, key: string, opts: { min?: number; max?: number; fallback?: number } = {}) {
  const raw = str(fd, key, { max: 20 });
  if (!raw) return opts.fallback ?? 0;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new FormError(`ערך לא תקין בשדה "${key}"`);
  if (opts.min !== undefined && n < opts.min) throw new FormError(`ערך נמוך מדי בשדה "${key}"`);
  if (opts.max !== undefined && n > opts.max) throw new FormError(`ערך גבוה מדי בשדה "${key}"`);
  return n;
}

export function optInt(fd: FormData, key: string, opts: { min?: number; max?: number } = {}) {
  return str(fd, key, { max: 20 }) ? int(fd, key, opts) : null;
}

/** Price typed in shekels ("49.90") -> agorot (4990). */
export function shekels(fd: FormData, key: string, required = false): number | null {
  const raw = str(fd, key, { max: 20 }).replace(/[₪,\s]/g, "");
  if (!raw) {
    if (required) throw new FormError("יש להזין מחיר");
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new FormError(`מחיר לא תקין: ${raw}`);
  return Math.round(Number(raw) * 100);
}

export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function date(fd: FormData, key: string) {
  const raw = str(fd, key, { max: 40 });
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new FormError("תאריך לא תקין");
  return d;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], fallback: T): T {
  const v = str(fd, key, { max: 50 });
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Only allow site-relative paths or http(s) URLs (blocks javascript: and data: links). */
export function safeUrl(fd: FormData, key: string, max = 1000) {
  const v = str(fd, key, { max });
  if (!v) return null;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
  } catch {}
  throw new FormError(`כתובת לא תקינה: ${v}`);
}

/** Turn a Hebrew/English title into a URL slug. Hebrew letters are kept (Google handles them well). */
export function slugify(input: string) {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/["'״׳`]/g, "")
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function slugFrom(fd: FormData, slugKey: string, fallbackText: string) {
  const s = slugify(str(fd, slugKey, { max: 120 }) || fallbackText);
  if (!s) throw new FormError("לא ניתן ליצור כתובת (slug) - יש למלא שם");
  return s;
}

/** Wraps a server action body: converts thrown FormErrors / unique-constraint errors to messages. */
export async function handle(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true, message: "נשמר בהצלחה" };
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002")
      return { error: "ערך זה כבר קיים (למשל כתובת או קוד כפולים)" };
    // Re-throw Next.js redirects / not-found
    if (typeof e === "object" && e && "digest" in e) throw e;
    console.error(e);
    return { error: "אירעה שגיאה בשמירה" };
  }
}
