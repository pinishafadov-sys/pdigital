"use client";

import { useState } from "react";

/** Opens WhatsApp chats one after another with the message ready; you press Send in each. */
export function WaSequence({ people }: { people: { id: string; name: string; href: string }[] }) {
  const [i, setI] = useState(0);
  if (!people.length) return <p className="muted" style={{ margin: 0 }}>אין ברשימה לקוחות עם מספר טלפון.</p>;
  const done = i >= people.length;
  const cur = people[Math.min(i, people.length - 1)];
  return (
    <div className="toolbar-row">
      {done ? (
        <>
          <span className="form-ok">עברת על כל {people.length} הלקוחות 🎉</span>
          <button type="button" className="btn btn-ghost" onClick={() => setI(0)}>להתחיל מחדש</button>
        </>
      ) : (
        <>
          <a
            href={cur.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            onClick={() => setTimeout(() => setI((x) => x + 1), 300)}
          >
            פתיחת וואטסאפ ל{cur.name} ({i + 1} מתוך {people.length})
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => setI((x) => x + 1)}>דילוג</button>
          {i > 0 && <button type="button" className="btn btn-ghost" onClick={() => setI((x) => Math.max(0, x - 1))}>חזרה אחת</button>}
          <span className="muted">אחרי שליחה בוואטסאפ, חוזרים לכאן ולוחצים שוב לבא בתור.</span>
        </>
      )}
    </div>
  );
}
