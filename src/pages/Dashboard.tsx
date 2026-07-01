import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, Globe2, Activity } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { AHDPageHeader, AHDPanel, AHDTag, countryFlag } from "@/components/ahd/primitives";
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
      <AHDPageHeader
        tag="🎛️ COMMAND CENTER"
        title={user.displayName}
        subtitle="Your politicians, countries, and live game feed"
        right={
          <Link to="/politicians/new" className="ahd-btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> CREATE POLITICIAN
          </Link>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <AHDPanel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-amber-500" />
            <div className="ahd-h3">Your Politicians</div>
            <AHDTag tone="amber">{pols?.length ?? 0}</AHDTag>
          </div>
          <div className="ahd-divider mb-3" />
          <div className="space-y-1.5">
            {hydrated && (!pols || pols.length === 0) && (
              <p className="ahd-meta">None yet. Create your first one.</p>
            )}
            {pols?.map((p) => (
              <Link
                key={p.id}
                to={`/politicians/${p.id}`}
                className="ahd-row flex items-center justify-between px-2 py-1.5"
              >
                <div>
                  <div className="text-sm text-zinc-200">{p.name}</div>
                  <div className="text-[10px] text-amber-600/70 uppercase tracking-wider">{p.officeId ? "In Office" : p.status}</div>
                </div>
                <AHDTag tone={(p.stats?.approval ?? 0) >= 50 ? "positive" : "negative"}>
                  {Math.round(p.stats?.approval ?? 0)}%
                </AHDTag>
              </Link>
            ))}
          </div>
        </AHDPanel>

        <AHDPanel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe2 className="h-4 w-4 text-amber-500" />
            <div className="ahd-h3">Countries</div>
            <AHDTag tone="amber">{countries?.length ?? 0}</AHDTag>
          </div>
          <div className="ahd-divider mb-3" />
          <div className="grid grid-cols-2 gap-1.5">
            {countries?.map((c) => (
              <Link key={c.id} to={`/countries/${c.id}`} className="ahd-row px-2 py-1.5">
                <div className="text-sm text-zinc-200 flex items-center gap-1.5">
                  <span>{countryFlag(c.id)}</span>{c.name}
                </div>
                <div className="text-[10px] text-amber-600/70">{c.code}</div>
              </Link>
            ))}
          </div>
        </AHDPanel>

        <AHDPanel className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-amber-500" />
            <div className="ahd-h3">Live Ticker</div>
            <AHDTag tone="amber">{events.length}</AHDTag>
          </div>
          <div className="ahd-divider mb-3" />
          <div className="max-h-72 space-y-1 overflow-auto pr-1">
            {events.length === 0 && <p className="ahd-meta">Waiting for the first tick…</p>}
            {events.map((e) => (
              <div key={e.id} className="ahd-row px-2 py-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <AHDTag tone="stage">{e.kind}</AHDTag>
                  <span className="text-[10px] text-amber-600/70">w{Math.round(e.week)}</span>
                </div>
                <div className="text-xs text-zinc-300">{e.message}</div>
              </div>
            ))}
          </div>
        </AHDPanel>
      </div>
    </AppShell>
  );
}