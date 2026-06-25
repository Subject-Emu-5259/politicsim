import { useParams, Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Building2, Vote } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { useLiveEvents } from "@/hooks/useLiveEvents";

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
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <div>
          <h1 className="text-3xl font-semibold">{country.name}</h1>
          <p className="text-sm text-muted-foreground">{country.code} • {(country.population / 1_000_000).toFixed(0)}M residents</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">GDP</p><p className="text-2xl font-semibold">${(country.gdp / 1000).toFixed(2)}T</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Unemployment</p><p className="text-2xl font-semibold">{country.unemploymentPct.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Inflation</p><p className="text-2xl font-semibold">{country.inflationPct.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Baseline approval</p><p className="text-2xl font-semibold">{country.approvalBaseline.toFixed(0)}%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="parties" className="mt-6">
        <TabsList>
          <TabsTrigger value="parties"><Building2 className="mr-1 h-4 w-4" /> Parties</TabsTrigger>
          <TabsTrigger value="demographics"><Users className="mr-1 h-4 w-4" /> Demographics</TabsTrigger>
          <TabsTrigger value="offices"><Vote className="mr-1 h-4 w-4" /> Offices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="grid gap-3 md:grid-cols-2">
          {parties.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <p className="font-semibold">{p.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.ideology} • {p.memberCount} members</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">${(p.treasuryUSD / 1_000_000).toFixed(1)}M</p>
                  <p className="text-xs text-muted-foreground">treasury</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="demographics" className="grid gap-3 md:grid-cols-3">
          {demographics.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{d.name}</CardTitle>
                <CardDescription>{(d.populationShare * 100).toFixed(0)}% of population</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Baseline approval: <span className="font-medium">{d.approvalBaseline.toFixed(0)}%</span></p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="offices" className="space-y-2">
          {offices.slice(0, 50).map((o) => (
            <Card key={o.id}>
              <CardContent className="flex items-center justify-between pt-6 text-sm">
                <div>
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.chamber ?? "—"} • {o.region}</p>
                </div>
                <Badge variant="outline">Next election w{o.nextElectionWeek}</Badge>
              </CardContent>
            </Card>
          ))}
          {offices.length > 50 && <p className="text-xs text-muted-foreground">Showing 50 of {offices.length} offices.</p>}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="max-h-[28rem] space-y-2 overflow-auto pt-6">
              {countryEvents.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
              {countryEvents.map((e) => (
                <div key={e.id} className="rounded-md border border-border p-2 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{e.kind}</Badge>
                    <span>w{Math.round(e.week)}</span>
                  </div>
                  <div className="mt-1">{e.message}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}