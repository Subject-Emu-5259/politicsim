// AHD visual-language primitives. Reusable across all pages to keep the
// terminal aesthetic consistent without duplicating Tailwind class strings.
//
// Visual references: https://www.ahousedividedgame.com (DEC VT100 terminal,
// amber-on-black, emoji-prefixed category tags, country flag chips,
// monospace numerics, no rounded corners).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Panel ──────────────────────────────────────────────────────────────────
// A bordered, dark-surfaced card. Replaces shadcn <Card> in AHD-styled pages.
export function AHDPageHeader({
  title,
  subtitle,
  tag,
  right,
}: {
  title: string;
  subtitle?: string;
  tag?: string;
  right?: ReactNode;
}) {
  return (
    <div className="ahd-section-header">
      <div className="flex items-baseline gap-3">
        {tag && <span className="ahd-tag">{tag}</span>}
        <h1 className="ahd-h1">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {subtitle && <span className="ahd-meta">{subtitle}</span>}
        {right}
      </div>
    </div>
  );
}

export function AHDPageFrame({ children }: { children: ReactNode }) {
  return <div className="ahd-frame">{children}</div>;
}

// ─── Stat strip ─────────────────────────────────────────────────────────────
// A row of 2-6 stat cells with monospace numbers, used for country/market
// dashboards. AHD uses these extensively on the corporation/profile pages.
export function AHDStatStrip({ stats }: { stats: Array<{ label: string; value: string; tone?: "default" | "positive" | "negative" | "amber" }> }) {
  return (
    <div className="ahd-stat-strip">
      {stats.map((s, i) => (
        <div key={i} className="ahd-stat-cell">
          <div className="ahd-stat-label">{s.label}</div>
          <div
            className={cn(
              "ahd-stat-value",
              s.tone === "positive" && "text-emerald-400",
              s.tone === "negative" && "text-rose-400",
              s.tone === "amber" && "text-amber-400",
            )}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tag chip ───────────────────────────────────────────────────────────────
// AHD's emoji-prefixed category badges (⚙️ Mechanics, 🐛 Bug Fixes, 🇺🇸 USA).
export function AHDTag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "amber" | "country" | "stage" | "positive" | "negative" }) {
  return <span className={cn("ahd-tag", tone !== "default" && `ahd-tag-${tone}`)}>{children}</span>;
}

// ─── Section header ─────────────────────────────────────────────────────────
// Use above a group of related content within a page.
export function AHDSection({ title, tag, right, children }: { title: string; tag?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="ahd-section-header">
        <div className="flex items-baseline gap-3">
          {tag && <span className="ahd-tag">{tag}</span>}
          <h2 className="ahd-h2">{title}</h2>
        </div>
        {right}
      </div>
      <div className="ahd-section-body">{children}</div>
    </section>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────
// A bordered, dark-surfaced card. Replaces shadcn <Card> in AHD-styled pages.
export function AHDPanel({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={cn("ahd-panel", onClick && "cursor-pointer hover:ahd-panel-hover", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Numeric formatter ─────────────────────────────────────────────────────
// AHD never shows 28780000000 — it abbreviates to ₳10.7B. Reusable across pages.
export function formatUSD(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

// ─── Country flag helper ────────────────────────────────────────────────────
// AHD's signature 🇺🇸 🇬🇧 🇩🇪 🇯🇵 chip pattern. Extensible for more codes.
const FLAGS: Record<string, string> = {
  usa: "🇺🇸", uk: "🇬🇧", jp: "🇯🇵", de: "🇩🇪", fr: "🇫🇷", ca: "🇨🇦", mx: "🇲🇽", cn: "🇨🇳", ru: "🇷🇺", in: "🇮🇳",
};
export function countryFlag(code: string): string {
  return FLAGS[code.toLowerCase()] ?? "🏳️";
}

// (placeholder removed — see end of file)─────────────────────────────────────────────────────
// Inline SVG sparkline. Used in stat cells and FX/polls cards. AHD uses these
// heavily on the corporation overview page.
export function AHDSparkline({ values, width = 80, height = 18, color = "#d4a04c" }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="ahd-sparkline" viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.25" />
    </svg>
  );
}
