"use client";

import { useState } from "react";

/**
 * Print and PDF both use the browser's print dialog with a print-only layout.
 * "PDF" works on computers and phones: choose "Save as PDF" as the printer.
 */
export function PrintButtons({ fileTitle }: { fileTitle: string }) {
  const [hint, setHint] = useState(false);
  const print = (asPdf: boolean) => {
    const prev = document.title;
    document.title = fileTitle; // becomes the suggested PDF file name
    setHint(asPdf);
    window.print();
    setTimeout(() => {
      document.title = prev;
    }, 1000);
  };
  return (
    <>
      <button type="button" className="btn btn-ghost" style={{ minHeight: 40 }} onClick={() => print(true)}>
        הורדה כ-PDF
      </button>
      <button type="button" className="btn btn-ghost" style={{ minHeight: 40 }} onClick={() => print(false)}>
        הדפסה
      </button>
      {hint && (
        <span role="status" className="muted no-print" style={{ fontSize: 13, flexBasis: "100%" }}>
          בחלון שנפתח, בשדה &quot;מדפסת&quot; או &quot;יעד&quot;, בחר <b>שמירה כ-PDF</b> (Save as PDF).
        </span>
      )}
    </>
  );
}
