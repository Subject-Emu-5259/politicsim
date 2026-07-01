import { Link } from "react-router-dom";
import { Vote, MapPin, Calendar } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { AHDPageHeader, AHDPanel, AHDTag } from "@/components/ahd/primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";

interface ElectionItem {
  id: string;
  officeId: string;
  officeName: string;
  countryId: string;
  week: number;
  stage: string;
  candidateCount: number;
  leaderName: string | null;
}

export default function ElectionsPage() {
  const { data: upcomingRes } = useApi<{ elections: ElectionItem[] }>({ url: "/api/elections?filter=upcoming", pollIntervalMs: 8000 });
  const upcoming = upcomingRes?.elections ?? [];
  const { data: recentRes } = useApi<{ elections: ElectionItem[] }>({ url: "/api/elections?filter=recent", pollIntervalMs: 8000 });
  const recent = recentRes?.elections ?? [];

  return (
    <AppShell>
      <AHDPageHeader tag="🗳️ ELECTIONS" title="Campaigns & Results" subtitle={`${upcoming?.length ?? 0} upcoming · ${recent?.length ?? 0} recent`} />

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList>
          <TabsTrigger value="upcoming"><Calendar className="mr-1 h-4 w-4" /> Upcoming</TabsTrigger>
          <TabsTrigger value="recent"><Vote className="mr-1 h-4 w-4" /> Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="grid gap-3 md:grid-cols-2">
          {(upcoming ?? []).map((e) => (
            <AHDPanel key={e.id} className="p-3">
              <div className="flex items-center justify-between">
                <Link to={`/countries/${e.countryId}`} className="ahd-h3 hover:text-amber-300">{e.officeName}</Link>
                <AHDTag tone="stage">{e.stage}</AHDTag>
              </div>
              <div className="ahd-meta mt-1.5 flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <span>{e.countryId.toUpperCase()}</span>
                <span>·</span>
                <span>w{e.week}</span>
                <span>·</span>
                <span>{e.candidateCount} candidate{e.candidateCount === 1 ? "" : "s"}</span>
              </div>
            </AHDPanel>
          ))}
          {upcoming?.length === 0 && <p className="ahd-meta">No upcoming elections.</p>}
        </TabsContent>

        <TabsContent value="recent" className="grid gap-3 md:grid-cols-2">
          {(recent ?? []).map((e) => (
            <AHDPanel key={e.id} className="p-3">
              <div className="flex items-center justify-between">
                <span className="ahd-h3">{e.officeName}</span>
                <AHDTag tone="stage">{e.stage}</AHDTag>
              </div>
              <div className="ahd-meta mt-1.5">w{e.week}</div>
              {e.leaderName ? <div className="ahd-meta mt-1.5 text-zinc-300">Leader: <span className="text-amber-300">{e.leaderName}</span></div> : <p className="ahd-meta mt-1.5">No winner recorded.</p>}
            </AHDPanel>
          ))}
          {recent?.length === 0 && <p className="ahd-meta">No recent elections.</p>}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}