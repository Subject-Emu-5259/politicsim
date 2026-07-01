import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Building2, Vote, Activity } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { AHDPageHeader, AHDPanel, AHDStatStrip, AHDTag, countryFlag, formatUSD, formatPct } from "@/components/ahd/primitives";

interface CountryDetail {
  country: { id: string; name: string; code: string; gdp: number; population: number; unemploymentPct: number; inflationPct: number; approvalBaseline: number };
  parties: Array<{ id: string; name: string; shortName: string; color: string; ideology: string; memberCount: number; treasuryUSD: number; leaderPoliticianId: string | null }>;
  demographics: Array<{ id: string; name: string; populationShare: number; approvalBaseline: number }>;
  offices: Array<{ id: string; name: string; type: string; region: string; chamber: string | null; termLengthWeeks: number; nextElectionWeek: number }>;
}

export default function CountryView() {
  const { id: countryId = "" } = useParams();
  const { data, loading, error } = useApi<CountryDetail>({ url: `/api/countries/${countryId}`, pollIntervalMs: 10000 });
  const { events } = useLiveEvents(20);

  if (loading && !data) return <AppShell><p>Loading country…</p></AppShell>;
  if (!data) return <AppShell><p>Country not found.</p></AppShell>;

  const { country, parties, demographics, offices } = data;
  const countryEvents = events.filter((e) => e.countryId === countryId);

  return (
    <AppShell>
      <AHDPageHeader
        tag={`${countryFlag(country.id)} ${country.id.toUpperCase()}`}
        title={country.name}
        subtitle={`${country.code} • ${(country.population / 1_000_000).toFixed(0)}M residents`}
        right={<AHDTag tone="amber">APPROVAL {formatPct(country.approvalBaseline, 0)}</AHDTag>}
      />

      <AHDPanel className="p-4 mb-4">
        <AHDStatStrip stats={[
          { label: "GDP", value: formatUSD(country.gdp) },
          { label: "UNEMP", value: formatPct(country.unemploymentPct) },
          { label: "INFLATION", value: formatPct(country.inflationPct) },
          { label: "APPROVAL", value: formatPct(country.approvalBaseline, 0), tone: country.approvalBaseline >= 50 ? "positive" : "negative" },
        ]} />
      </AHDPanel>

      <Tabs defaultValue="parties" className="mt-6">
        <TabsList>
          <TabsTrigger value="parties"><Building2 className="mr-1 h-4 w-4" /> Parties</TabsTrigger>
          <TabsTrigger value="demographics"><Users className="mr-1 h-4 w-4" /> Demographics</TabsTrigger>
          <TabsTrigger value="offices"><Vote className="mr-1 h-4 w-4" /> Offices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="grid gap-3 md:grid-cols-2">
          {parties.map((p) => (
            <AHDPanel key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3" style={{ backgroundColor: p.color }} />
                  <span className="ahd-h3">{p.name}</span>
                </div>
                <AHDTag tone="amber">{p.ideology}</AHDTag>
              </div>
              <div className="ahd-meta mt-1">{p.shortName} • {p.memberCount} members</div>
              <AHDStatStrip stats={[
                { label: "TREASURY", value: formatUSD(p.treasuryUSD) },
                { label: "ID", value: p.id },
              ]} />
            </AHDPanel>
          ))}
        </TabsContent>

        <TabsContent value="demographics" className="grid gap-3 md:grid-cols-3">
          {demographics.map((d) => (
            <AHDPanel key={d.id} className="p-4">
              <AHDPageHeader tag="👥 DEMO" title={d.name} subtitle={`${(d.populationShare * 100).toFixed(0)}% of population`} />
              <AHDStatStrip stats={[
                { label: "APPROVAL", value: formatPct(d.approvalBaseline, 0), tone: d.approvalBaseline >= 50 ? "positive" : "negative" },
              ]} />
            </AHDPanel>
          ))}
        </TabsContent>

        <TabsContent value="offices" className="space-y-2">
          {offices.slice(0, 50).map((o) => (
            <AHDPanel key={o.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="ahd-h3">{o.name}</div>
                  <div className="ahd-meta">{o.chamber ?? "—"} • {o.region} • {o.type}</div>
                </div>
                <AHDTag tone="amber">NEXT ELECTION w{o.nextElectionWeek}</AHDTag>
              </div>
            </AHDPanel>
          ))}
          {offices.length > 50 && <p className="ahd-meta">Showing 50 of {offices.length} offices.</p>}
        </TabsContent>

        <TabsContent value="activity">
          <AHDPanel className="p-3 max-h-[28rem] overflow-auto">
            {countryEvents.length === 0 && <p className="ahd-meta">No recent activity.</p>}
            {countryEvents.map((e) => (
              <div key={e.id} className="border-b border-zinc-800/50 py-2 last:border-0">
                <div className="flex items-center justify-between">
                  <AHDTag tone="stage">{e.kind}</AHDTag>
                  <span className="ahd-meta">w{Math.round(e.week)}</span>
                </div>
                <div className="mt-1 text-sm">{e.message}</div>
              </div>
            ))}
          </AHDPanel>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}