import { ImageResponse } from "next/og";

// Default image shown when the site is shared on WhatsApp / Facebook.
export const alt = "pdigital - הכל באתר אחד!";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          background: "linear-gradient(135deg, #2B1245 0%, #5B2A7E 60%, #8E55C2 100%)",
        }}
      >
        <svg width="260" height="290" viewBox="-2 -2 58 64">
          <polygon points="0,0 27,15 18,30" fill="#4C9BE0" />
          <polygon points="0,0 18,30 0,60" fill="#F0348A" />
          <polygon points="18,30 27,45 0,60" fill="#B07CE0" />
          <polygon points="27,15 54,30 27,45 18,30" fill="#F7901E" />
        </svg>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 700, letterSpacing: -4 }}>
          <span style={{ color: "#B07CE0" }}>p</span>
          <span style={{ color: "#F7901E" }}>digital</span>
        </div>
      </div>
    ),
    size,
  );
}
