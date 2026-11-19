"use client";

import { useEffect } from "react";

/** The filters panel starts closed (phones see products first); on wide screens it opens. */
export function OpenOnDesktop({ id }: { id: string }) {
  useEffect(() => {
    const el = document.getElementById(id) as HTMLDetailsElement | null;
    if (el && window.matchMedia("(min-width: 960px)").matches) el.open = true;
  }, [id]);
  return null;
}
