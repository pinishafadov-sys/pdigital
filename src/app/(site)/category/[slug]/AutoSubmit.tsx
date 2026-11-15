"use client";

import { useEffect } from "react";

/** Submits a GET filter form automatically when a checkbox or select changes (works without JS too). */
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.type === "checkbox" || t.tagName === "SELECT") form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, [formId]);
  return null;
}
