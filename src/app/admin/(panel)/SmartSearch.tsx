"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { matchDestinations } from "@/lib/admin-destinations";

/**
 * Dashboard search: as you type, shows matching admin screens/settings to jump to,
 * plus "search for X in orders, products, customers..." (Enter on nothing selected).
 * Keyboard: ↑ ↓ to move, Enter to open, Esc to clear.
 */
export function SmartSearch({ autoFocus }: { autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(-1);
  const matches = useMemo(() => matchDestinations(q), [q]);
  const options = useMemo(
    () => [
      ...matches.map((m) => ({ key: m.href, label: m.label, hint: m.group, href: m.href })),
      ...(q.trim().length >= 2
        ? [{ key: "__data", label: `חיפוש "${q.trim()}" בהזמנות, לקוחות, מוצרים ותוכן`, hint: "נתונים", href: `/admin/search?q=${encodeURIComponent(q.trim())}` }]
        : []),
    ],
    [matches, q],
  );
  const go = (href: string) => {
    setQ("");
    setActive(-1);
    router.push(href);
  };

  return (
    <div className="smart-search" role="search">
      <label htmlFor={`${listId}-in`} className="visually-hidden">חיפוש במערכת הניהול</label>
      <input
        id={`${listId}-in`}
        type="search"
        value={q}
        autoFocus={autoFocus}
        placeholder="מה לחפש? למשל: מלאי, פרטי העסק, קופון, דוח שנתי, שם לקוח או טלפון..."
        autoComplete="off"
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(options.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(-1, a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = options[active >= 0 ? active : 0];
            if (pick) go(pick.href);
          } else if (e.key === "Escape") {
            setQ("");
            setActive(-1);
          }
        }}
      />
      {options.length > 0 && (
        <ul id={listId} role="listbox" className="smart-results">
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                go(o.href);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{o.label}</span>
              <span className="smart-hint">{o.hint}</span>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && options.length === 0 && <p className="smart-empty">לא נמצא. נסה מילה אחרת.</p>}
    </div>
  );
}
