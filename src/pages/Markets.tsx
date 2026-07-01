import { useApi } from "@/hooks/useApi";
import AppShell from "@/components/layout/AppShell";
import { AHDPageHeader, AHDPanel, AHDTag, AHDSparkline, AHDStatStrip } from "@/components/ahd/primitives";
import { TrendingUp, DollarSign, Factory, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

interface FxRow { code: string; week: number; usdPerUnit: number; }
interface Country { id: string; code: string; name: string; gdp: number; population: number; }

export default function Markets() {
  // Use a high limit so we have FX history to sparkline.
  const { data: fxRes } = useApi<{ rates: FxRow[] }>({ url: "/api/fx?limit=200", pollIntervalMs: 12000 });
  const { data: countriesRes } = useApi<{ countries: Country[] }>({ url: "/api/countries", pollIntervalMs: 30000 });

  // Group FX rates by code, sorted by week, take the latest series
  const seriesByCode = new Map<string, FxRow[]>();
  for (const r of fxRes?.rates ?? []) {
    if (!seriesByCode.has(r.code)) seriesByCode.set(r.code, []);
    seriesByCode.get(r.code)!.push(r);
  }
  for (const arr of seriesByCode.values()) arr.sort((a, b) => a.week - b.week);

  const latestByCode = new Map<string, FxRow>();
  for (const [code, arr] of seriesByCode) if (arr.length) latestByCode.set(code, arr[arr.length - 1]);

  const countries = countriesRes?.countries ?? [];

  return (
    <AppShell>
      <AHDPageHeader
        tag="📈 MARKETS"
        title="Markets & Forex"
        subtitle="Currency exchange rates, commodities (roadmap), and corporation stock data (roadmap)."
      />

      {/* Forex section */}
      <div className="mb-3 flex items-center gap-2">
        <AHDTag tone="amber">💱 FOREX</AHDTag>
        <span className="ahd-meta">Per-week USD anchor rate</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3 mb-6">
        {[...latestByCode.values()].length === 0 ? (
          <AHDPanel className="p-4 col-span-3">
            <p className="ahd-meta">No FX rates recorded yet — wait for the next tick (1 real hour = 1 game week).</p>
          </AHDPanel>
        ) : (
          [...latestByCode.values()].map((r) => {
            const series = seriesByCode.get(r.code) ?? [];
            const values = series.map((s) => s.usdPerUnit);
            const first = values[0] ?? r.usdPerUnit;
            const last = values[values.length - 1] ?? r.usdPerUnit;
            const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
            const tone = changePct > 0.5 ? "positive" : changePct < -0.5 ? "negative" : "amber";
            return (
              <AHDPanel key={r.code} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="ahd-h3">{r.code}</div>
                    <div className="ahd-meta">1 {r.code} = ₳{r.usdPerUnit.toFixed(4)}</div>
                  </div>
                  <AHDTag tone={tone === "positive" ? "positive" : tone === "negative" ? "negative" : "amber"}>
                    {changePct > 0 ? "▲" : changePct < 0 ? "▼" : "·"} {Math.abs(changePct).toFixed(2)}%
                  </AHDTag>
                </div>
                <AHDSparkline values={values} width={240} height={36} color={tone === "positive" ? "#34d399" : tone === "negative" ? "#fb7185" : "#d4a04c"} />
                <AHDStatStrip
                  stats={[
                    { label: "WEEK", value: `w${r.week}` },
                    { label: "N", value: `${series.length}` },
                    { label: "MIN", value: `₳${Math.min(...values).toFixed(4)}` },
                    { label: "MAX", value: `₳${Math.max(...values).toFixed(4)}` },
                  ]}
                />
              </AHDPanel>
            );
          })
        )}
      </div>

      {/* Commodities + Corporations roadmap */}
      <div className="mb-3 flex items-center gap-2">
        <AHDTag tone="amber">📦 COMMODITIES</AHDTag>
        <AHDTag tone="amber">🏭 CORPORATIONS</AHDTag>
        <span className="ahd-meta">Sprints 12-15</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <AHDPanel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            <span className="ahd-h3">Commodities</span>
          </div>
          <p className="ahd-meta mb-2">Crude oil, natural gas, copper, wheat. Price elastic to signed-bill policy effects.</p>
          <AHDTag tone="amber">ROADMAP</AHDTag>
        </AHDPanel>
        <AHDPanel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="h-4 w-4 text-amber-400" />
            <span className="ahd-h3">Corporations</span>
          </div>
          <p className="ahd-meta mb-2">SOE and private firms with CEO management, sector specialization, tech trees (per AHD v0.3.6).</p>
          <AHDTag tone="amber">ROADMAP</AHDTag>
        </AHDPanel>
      </div>
    </AppShell>
  );
}
