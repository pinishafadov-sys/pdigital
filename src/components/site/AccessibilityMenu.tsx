"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconAccessibility } from "@/components/Icons";

type Prefs = { fs?: number; contrast?: boolean; links?: boolean; readable?: boolean; still?: boolean };
const KEY = "pd-a11y";
const TOGGLES: { key: Exclude<keyof Prefs, "fs">; label: string }[] = [
  { key: "contrast", label: "ניגודיות גבוהה" },
  { key: "links", label: "הדגשת קישורים" },
  { key: "readable", label: "גופן קריא" },
  { key: "still", label: "עצירת אנימציות" },
];

function apply(p: Prefs) {
  const d = document.documentElement;
  d.style.setProperty("--a11y-scale", String(p.fs ?? 1));
  for (const t of TOGGLES) d.classList.toggle(`a11y-${t.key}`, !!p[t.key]);
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read saved prefs once on mount
      setPrefs(JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const update = (p: Prefs) => {
    setPrefs(p);
    apply(p);
  };
  const fs = prefs.fs ?? 1;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="a11y-fab"
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="תפריט נגישות"
        onClick={() => setOpen((o) => !o)}
      >
        <IconAccessibility size={28} color="#fff" />
      </button>
      {open && (
        <div ref={panelRef} id="a11y-panel" className="a11y-panel" role="dialog" aria-label="הגדרות נגישות">
          <h2>נגישות</h2>
          <div className="row" role="group" aria-label="גודל טקסט">
            <button type="button" className="btn btn-ghost" onClick={() => update({ ...prefs, fs: Math.min(1.5, +(fs + 0.1).toFixed(1)) })}>
              א+ הגדלה
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => update({ ...prefs, fs: Math.max(0.9, +(fs - 0.1).toFixed(1)) })}>
              א- הקטנה
            </button>
          </div>
          {TOGGLES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="btn btn-ghost btn-block"
              aria-pressed={!!prefs[t.key]}
              onClick={() => update({ ...prefs, [t.key]: !prefs[t.key] })}
            >
              {t.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => update({})}>
            איפוס הגדרות
          </button>
          <Link href="/pages/accessibility">הצהרת נגישות</Link>
        </div>
      )}
    </>
  );
}
