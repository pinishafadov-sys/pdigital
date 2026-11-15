"use client";

import { useState, type ReactNode } from "react";

/** Weekly-deals category tabs. Cards are rendered on the server and passed in, tagged by category. */
export function DealsTabs({
  tabs,
  cards,
}: {
  tabs: { slug: string; name: string }[];
  cards: { key: string; cat: string; node: ReactNode }[];
}) {
  const [active, setActive] = useState("all");
  const shown = active === "all" ? cards : cards.filter((c) => c.cat === active);
  const all = [{ slug: "all", name: "הכל" }, ...tabs];
  return (
    <>
      <div className="tabs" role="tablist" aria-label="סינון מבצעים לפי מחלקה">
        {all.map((t) => (
          <button
            key={t.slug}
            role="tab"
            type="button"
            className="tab"
            aria-selected={active === t.slug}
            aria-controls="deals-panel"
            onClick={() => setActive(t.slug)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div id="deals-panel" role="tabpanel" className="rail" aria-live="polite">
        {shown.length ? shown.map((c) => <div key={c.key}>{c.node}</div>) : <p className="empty">אין מבצעים במחלקה הזו כרגע</p>}
      </div>
    </>
  );
}
