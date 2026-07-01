import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useApi } from "@/hooks/useApi";
import { ChevronRight } from "lucide-react";
import { AHDPageHeader, AHDPanel, AHDStatStrip, AHDTag, countryFlag, formatUSD } from "@/components/ahd/primitives";

interface CountrySummary {
  id: string; code: string; name: string; gdp: number; population: number;
  unemploymentPct: number; inflationPct: number; approvalBaseline: number;
}

export default function World() {
  const { data } = useApi<{ countries: CountrySummary[] }>({ url: "/api/countries", pollIntervalMs: 10000 });

  return (
    <AppShell>
      <AHDPageHeader
        tag="🌐 WORLD"
        title="Countries"
        subtitle={`${data?.countries.length ?? 0} active nations · baseline approval tracked weekly`}
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.countries.map((c) => {
          const approval = c.approvalBaseline;
          const tone = approval >= 60 ? "positive" : approval <= 40 ? "negative" : "amber";
          return (
            <Link key={c.id} to={`/countries/${c.id}`}>
              <AHDPanel className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{countryFlag(c.id)}</span>
                    <div>
                      <div className="ahd-h3">{c.name}</div>
                      <div className="ahd-meta">{c.code}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-500/40 group-hover:text-amber-400" />
                </div>

                <AHDStatStrip
                  stats={[
                    { label: "GDP", value: formatUSD(c.gdp) },
                    { label: "POP", value: `${(c.population / 1e6).toFixed(0)}M` },
                    { label: "UNEMP", value: `${c.unemploymentPct.toFixed(1)}%` },
                    { label: "INFLATION", value: `${c.inflationPct.toFixed(1)}%` },
                    { label: "APPROVAL", value: `${c.approvalBaseline.toFixed(0)}%`, tone },
                  ]}
                />

                <div className="mt-3 flex items-center gap-2">
                  <AHDTag tone="country">{countryFlag(c.id)} {c.id.toUpperCase()}</AHDTag>
                  <AHDTag tone="amber">w{c.approvalBaseline >= 50 ? "▲" : "▼"} {Math.abs(c.approvalBaseline - 50).toFixed(0)}pt from baseline</AHDTag>
                </div>
              </AHDPanel>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
