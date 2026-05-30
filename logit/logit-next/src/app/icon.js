import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Served at /icon.png — referenced by manifest.json and browser tab favicon.
export default function Icon() {
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
          // Rounded corners that satisfy the maskable icon safe-zone (80% inner circle).
          borderRadius: "112px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "296px",
            fontWeight: 700,
            lineHeight: 1,
            // Georgia is available in Satori's built-in font stack.
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
