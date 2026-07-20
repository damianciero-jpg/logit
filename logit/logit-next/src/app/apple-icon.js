import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Served at /apple-icon (generated route) — used by iOS for the home-screen icon.
export default function AppleIcon() {
  const mode    = process.env.NEXT_PUBLIC_APP_MODE || "educator";
  const isTrade = mode === "trade";
  const primary = isTrade ? "#F4811F" : "#E63946";
  const letter  = isTrade ? "S" : "L";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: primary,
          borderRadius: "40px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "104px",
            fontWeight: 700,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
          }}
        >
          {letter}
        </span>
      </div>
    ),
    { ...size }
  );
}
