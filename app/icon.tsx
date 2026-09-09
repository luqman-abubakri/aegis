import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ alignItems: "center", background: "#FAF9F6", display: "flex", height: "100%", justifyContent: "center", width: "100%" }}>
        <img alt="Intervyou.ai" src={logoDataUri} style={{ height: "54px", width: "54px" }} />
      </div>
    ),
    size,
  );
}