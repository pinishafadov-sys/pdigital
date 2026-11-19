"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { SmartImage } from "@/components/SmartImage";
import { formatPrice } from "@/lib/format";
import type { SearchSuggestions } from "@/lib/queries";

const EMPTY: SearchSuggestions = { links: [], products: [] };

/**
 * Search box with live suggestions: matching categories / site pages /
 * articles, then products (picture, name, price). Arrows + Enter pick one,
 * Esc closes. Without JavaScript it is a plain form that opens the results page.
 */
export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchSuggestions>(EMPTY);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLFormElement>(null);

  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        setData((await res.json()) as SearchSuggestions);
        setActive(-1);
      } catch {
        /* aborted or offline: the plain search still works */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const show = open && term.length >= 2;
  const { links, products } = term.length >= 2 ? data : EMPTY;
  const allHref = `/search?q=${encodeURIComponent(term)}`;
  // Keyboard order: links, products, "all results".
  const hrefs = [...links.map((l) => l.href), ...products.map((p) => `/product/${p.slug}`), allHref];
  const allIndex = hrefs.length - 1;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % hrefs.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? hrefs.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(hrefs[active]);
    }
  };

  const optId = (i: number) => `${listId}-o${i}`;
  const opt = (i: number) => ({
    id: optId(i),
    role: "option" as const,
    "aria-selected": active === i,
    onMouseEnter: () => setActive(i),
    onClick: () => go(hrefs[i]),
  });

  return (
    <form
      ref={boxRef}
      action="/search"
      method="get"
      role="search"
      className="header-search search-box"
      onSubmit={(e) => {
        e.preventDefault();
        if (term.length >= 2) go(allHref);
      }}
    >
      <label htmlFor="site-search" className="visually-hidden">
        חיפוש באתר
      </label>
      <input
        id="site-search"
        type="search"
        name="q"
        placeholder="מה תרצו למצוא?"
        maxLength={80}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? optId(active) : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      <button type="submit" aria-label="חיפוש">
        <IconSearch size={24} />
      </button>

      {show && (
        <div className="search-pop">
          <ul id={listId} role="listbox" aria-label="הצעות חיפוש">
            {links.map((l, i) => (
              <li key={l.href} {...opt(i)} className={`sp-link${active === i ? " active" : ""}`}>
                <span className="sp-kind">{l.kind}</span>
                <span className="sp-name">{l.label}</span>
                <span aria-hidden="true">←</span>
              </li>
            ))}
            {products.map((p, j) => {
              const i = links.length + j;
              const sale = p.compareAt != null && p.compareAt > p.price;
              return (
                <li key={p.slug} {...opt(i)} className={active === i ? "active" : undefined}>
                  <span className="sp-img">
                    {p.imageUrl && (
                      <SmartImage src={p.imageUrl} alt="" width={48} height={48} sizes="48px" />
                    )}
                  </span>
                  <span className="sp-text">
                    <span className="sp-name">{p.name}</span>
                    <span className="sp-cat">{p.category}</span>
                  </span>
                  <span className="sp-price">
                    {sale && <s>₪{formatPrice(p.compareAt!)}</s>}
                    <b className={sale ? "sale" : undefined}>₪{formatPrice(p.price)}</b>
                  </span>
                </li>
              );
            })}
            <li {...opt(allIndex)} className={`sp-all${active === allIndex ? " active" : ""}`}>
              {products.length
                ? `לכל המוצרים שנמצאו עבור "${term}" ←`
                : loading
                  ? "מחפש..."
                  : links.length
                    ? `חיפוש מוצרים: "${term}" ←`
                    : `לא נמצא דבר עבור "${term}"`}
            </li>
          </ul>
        </div>
      )}
      <span className="visually-hidden" aria-live="polite">
        {show && !loading ? (hrefs.length > 1 ? `${hrefs.length - 1} הצעות` : "לא נמצאו תוצאות") : ""}
      </span>
    </form>
  );
}
