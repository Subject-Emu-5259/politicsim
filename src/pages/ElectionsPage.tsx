import { Link } from "react-router-dom";
import { Vote, MapPin, Calendar } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <h1 className="text-3xl font-semibold">Elections</h1>
      <p className="text-sm text-muted-foreground">Campaigns, ballots, and certified results.</p>

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList>
          <TabsTrigger value="upcoming"><Calendar className="mr-1 h-4 w-4" /> Upcoming</TabsTrigger>
          <TabsTrigger value="recent"><Vote className="mr-1 h-4 w-4" /> Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="grid gap-3 md:grid-cols-2">
          {(upcoming ?? []).map((e) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{e.officeName}</CardTitle>
                <CardDescription>
                  <MapPin className="mr-1 inline h-3 w-3" />
                  <Link to={`/countries/${e.countryId}`} className="hover:underline">{e.countryId.toUpperCase()}</Link> • w{e.week}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <p>{e.candidateCount} candidate{e.candidateCount === 1 ? "" : "s"}</p>
                <Badge variant="outline">{e.stage}</Badge>
              </CardContent>
            </Card>
          ))}
          {upcoming?.length === 0 && <p className="text-sm text-muted-foreground">No upcoming elections.</p>}
        </TabsContent>

        <TabsContent value="recent" className="grid gap-3 md:grid-cols-2">
          {(recent ?? []).map((e) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{e.officeName}</CardTitle>
                <CardDescription>w{e.week}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                {e.leaderName ? <p>Leader: <span className="font-medium">{e.leaderName}</span></p> : <p className="text-muted-foreground">No winner recorded.</p>}
                <Badge variant="outline" className="mt-1">{e.stage}</Badge>
              </CardContent>
            </Card>
          ))}
          {recent?.length === 0 && <p className="text-sm text-muted-foreground">No recent elections.</p>}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}