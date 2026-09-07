import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Nexly AI interview preparation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "og-image.png"));
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#020817",
          color: "#F8FAFC",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px 88px",
          position: "relative",
          width: "100%",
          fontFamily: "Inter, Arial, sans-serif",
          overflow: "hidden",
        }}
      >
        <div style={{ background: "#1d4ed8", borderRadius: "999px", filter: "blur(100px)", height: "360px", opacity: 0.3, position: "absolute", right: "-80px", top: "-150px", width: "460px" }} />
        <div style={{ background: "#06b6d4", borderRadius: "999px", filter: "blur(120px)", height: "260px", opacity: 0.16, position: "absolute", bottom: "-120px", left: "-80px", width: "360px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ alignItems: "center", background: "linear-gradient(135deg, #2563eb, #06b6d4)", borderRadius: "28px", display: "flex", height: "112px", justifyContent: "center", width: "112px" }}>
            <img alt="" src={logoDataUri} style={{ height: "78px", width: "78px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "44px", fontWeight: 800, letterSpacing: "2px" }}>Nexly</div>
            <div style={{ color: "#94a3b8", fontSize: "22px", marginTop: "4px" }}>AI Interview Coach</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "58px", maxWidth: "880px" }}>
          <div style={{ color: "#67e8f9", fontSize: "24px", fontWeight: 600, letterSpacing: "1px" }}>PREPARE. PRACTICE. PERFORM.</div>
          <div style={{ fontSize: "58px", fontWeight: 800, lineHeight: 1.08, marginTop: "18px" }}>Ace every technical interview.</div>
          <div style={{ color: "#cbd5e1", fontSize: "26px", lineHeight: 1.35, marginTop: "22px" }}>Realistic AI voice and text interviews, resume analysis, scoring, and feedback that helps you improve.</div>
        </div>
      </div>
    ),
    size,
  );
}