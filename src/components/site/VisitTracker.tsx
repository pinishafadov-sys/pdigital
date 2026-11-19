"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Reports each storefront page view to /api/track (no cookies, see the route). */
export function VisitTracker() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    // Where the visitor came from is only known on the first page they open.
    const referrer = first.current ? document.referrer : "";
    first.current = false;
    const body = JSON.stringify({ p: path, r: referrer });
    try {
      if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {
      /* statistics must never break the site */
    }
  }, [path]);
  return null;
}
