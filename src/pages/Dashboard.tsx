import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, Globe2, Activity } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useLiveEvents } from "@/hooks/useLiveEvents";

interface PoliticianSummary {
  id: string;
  name: string;
  countryId: string;
  status: string;
  stats: { approval: number };
  officeId: string | null;
}

interface PoliticianListResponse { politicians: PoliticianSummary[]; }
interface CountryListResponse { countries: Array<{ id: string; name: string; code: string }>; }

export default function Dashboard() {
  const { user } = useAuth();
  const { data: polRes } = useApi<PoliticianListResponse>({ url: "/api/politicians?owner=me", pollIntervalMs: 8000 });
  const pols = polRes?.politicians ?? [];
  const { data: countryRes } = useApi<CountryListResponse>({ url: "/api/countries", pollIntervalMs: 8000 });
  const countries = countryRes?.countries ?? [];
  const { events } = useLiveEvents(15);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  if (!user) return null;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as <span className="font-medium text-foreground">{user.displayName}</span></p>
          <h1 className="text-3xl font-semibold">Command Center</h1>
        </div>
        <Button asChild>
          <Link to="/politicians/new"><Plus className="h-4 w-4" /> Create politician</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Your politicians</CardTitle>
            <CardDescription>The people you are running or have placed in office.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {hydrated && (!pols || pols.length === 0) && (
              <p className="text-sm text-muted-foreground">None yet. Create your first one.</p>
            )}
            {pols?.map((p) => (
              <Link
                key={p.id}
                to={`/politicians/${p.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.officeId ? "In office" : p.status}</div>
                </div>
                <Badge variant={(p.stats?.approval ?? 0) >= 50 ? "default" : "secondary"}>
                  {Math.round(p.stats?.approval ?? 0)}%
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe2 className="h-4 w-4" /> Countries</CardTitle>
            <CardDescription>Pick a country to watch its politics.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {countries?.map((c) => (
              <Link key={c.id} to={`/countries/${c.id}`} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.code}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Live ticker</CardTitle>
            <CardDescription>Game-wide events as they happen.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 space-y-1 overflow-auto pr-2">
            {events.length === 0 && <p className="text-sm text-muted-foreground">Waiting for the first tick…</p>}
            {events.map((e) => (
              <div key={e.id} className="rounded-md border border-border px-2 py-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{e.kind}</Badge>
                  <span className="text-muted-foreground">w{Math.round(e.week)}</span>
                </div>
                <div className="mt-1">{e.message}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}