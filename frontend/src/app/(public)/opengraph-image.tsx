import { ImageResponse } from "next/og";

export const alt = "Benue Print — from idea to production";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0b0b", color: "#f2efe9", padding: 72 }}>
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase", display: "flex" }}>Benue Print</div>
        <div style={{ fontSize: 132, fontWeight: 700, lineHeight: 0.92, letterSpacing: -6, textTransform: "uppercase", display: "flex", flexDirection: "column" }}>
          <span>From idea</span><span style={{ color: "#2bb98c" }}>to production.</span>
        </div>
      </div>
    ),
    size,
  );
}
