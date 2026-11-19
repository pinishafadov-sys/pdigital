import "server-only";
import { revalidatePath, unstable_cache, updateTag } from "next/cache";

/**
 * Storefront data cache. Public data (settings, menu, home page, categories,
 * products, articles) is kept in memory so a visit does not wait for the
 * database. Every admin change calls refreshSite(), which clears it at once;
 * as a safety net entries also refresh on their own every few minutes.
 */
export const SITE_TAG = "site";
const REVALIDATE_SECONDS = 300;

// Cached values come back as JSON, so dates are turned back into Date objects.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function revive<T>(v: T): T {
  if (typeof v === "string") return (ISO.test(v) ? new Date(v) : v) as T;
  if (Array.isArray(v)) return v.map(revive) as T;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = revive(x);
    return out as T;
  }
  return v;
}

export function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) {
  const c = unstable_cache(fn, ["pd", key], { tags: [SITE_TAG], revalidate: REVALIDATE_SECONDS });
  return async (...args: A): Promise<R> => revive(await c(...args));
}

/** Call from admin Server Actions after any change that shows on the site. */
export function refreshSite() {
  updateTag(SITE_TAG);
  revalidatePath("/", "layout");
}
