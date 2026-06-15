import { ImageResponse } from "next/og";

// Site-wide social card. Rendered at build time by Satori (flexbox subset only — no
// Tailwind, no oklch), so brand colors are hard-coded approximations of the tokens.
export const alt = "CheckAIVisible — Who does AI actually recommend?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0f0f10";
const SURFACE = "#161618";
const GOLD = "#d6b15e";
const TEXT = "#ededed";
const MUTED = "#9a9a9e";
const BORDER = "rgba(255,255,255,0.10)";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          backgroundImage:
            "radial-gradient(900px 500px at 80% -10%, rgba(214,177,94,0.10), transparent), radial-gradient(700px 400px at 0% 110%, rgba(214,177,94,0.06), transparent)",
          padding: "72px 80px",
        }}
      >
        {/* brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              border: `1px solid ${BORDER}`,
              backgroundColor: SURFACE,
              color: GOLD,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            AI
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: TEXT, letterSpacing: -1 }}>
            Check<span style={{ color: GOLD }}>AI</span>Visible
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 76, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.05 }}>
            Who does AI&nbsp;<span style={{ color: GOLD }}>actually</span>&nbsp;recommend?
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: MUTED, lineHeight: 1.3, maxWidth: 920 }}>
            Live leaderboards of what ChatGPT, Gemini &amp; Perplexity recommend — plus a free
            AI-readiness checker for any site.
          </div>
        </div>

        {/* footer rule */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: MUTED }}>
          <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, backgroundColor: GOLD }} />
          checkaivisible.com · sourced · refreshed weekly
        </div>
      </div>
    ),
    { ...size },
  );
}
