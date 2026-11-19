"use client";

import { useState } from "react";
import { IconBox } from "@/components/Icons";
import { SmartImage } from "@/components/SmartImage";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [i, setI] = useState(0);
  const cur = images[i];
  return (
    <div className="panel gallery">
      <div className="gallery-main">
        {cur ? (
          // Main product photo = the page's largest element, so it loads first.
          <SmartImage src={cur.url} alt={cur.alt || name} width={600} height={600} priority={i === 0} sizes="(max-width: 900px) 92vw, 460px" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <IconBox size={72} />
            <span>[תמונה ראשית]</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="thumbs" role="group" aria-label="תמונות המוצר">
          {images.map((img, idx) => (
            <button
              key={img.url}
              type="button"
              className="thumb"
              aria-pressed={idx === i}
              aria-label={`תמונה ${idx + 1}`}
              onClick={() => setI(idx)}
            >
              <SmartImage src={img.url} alt="" width={76} height={76} sizes="76px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
