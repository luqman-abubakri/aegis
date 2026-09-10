import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Intervyou.ai technical interview preparation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "og-image.png"));
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#111111",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px 88px",
          position: "relative",
          width: "100%",
          fontFamily: "Sora, Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ alignItems: "center", background: "#F97316", display: "flex", height: "112px", justifyContent: "center", width: "112px" }}>
            <img alt="" src={logoDataUri} style={{ height: "78px", width: "78px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "44px", fontWeight: 800, letterSpacing: "2px" }}>Intervyou.ai</div>
            <div style={{ color: "#cccccc", fontSize: "22px", marginTop: "4px" }}>AI Interview Coach</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "58px", maxWidth: "880px" }}>
          <div style={{ color: "#F97316", fontSize: "24px", fontWeight: 600, letterSpacing: "1px" }}>PREPARE. PRACTICE. PERFORM.</div>
          <div style={{ fontSize: "58px", fontWeight: 800, lineHeight: 1.08, marginTop: "18px" }}>Ace every technical interview.</div>
          <div style={{ color: "#cccccc", fontSize: "26px", lineHeight: 1.35, marginTop: "22px" }}>Realistic AI voice and text interviews, resume analysis, scoring, and feedback that helps you improve.</div>
        </div>
      </div>
    ),
    size,
  );
}