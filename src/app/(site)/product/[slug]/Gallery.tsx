"use client";

import { useState } from "react";
import { IconBox } from "@/components/Icons";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [i, setI] = useState(0);
  const cur = images[i];
  return (
    <div className="panel gallery">
      <div className="gallery-main">
        {cur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.url} alt={cur.alt || name} width={600} height={600} fetchPriority="high" />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" loading="lazy" width={76} height={76} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
