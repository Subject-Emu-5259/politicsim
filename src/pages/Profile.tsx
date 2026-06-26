import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import { fetchApi } from "@/lib/fetchClient";
import { toast } from "sonner";
import {
  ArrowLeft, User, TrendingUp, Award, Clock, BarChart3, Activity, Vote, FileText,
} from "lucide-react";

interface ProfileData {
  politician: {
    id: string; name: string; ideology: string; status: string;
    officeId: string | null; homeRegion: string;
    demographics: { age: number; gender: string; ethnicity: string };
    stats: { charisma: number; competence: number; integrity: number; stamina: number; approval: number; fundraising: number };
    partyId: string | null; countryId: string; createdAt: number;
  };
  bio: {
    age: number; gender: string; ethnicity: string;
    party: { id: string; name: string; shortName: string; color: string } | null;
    country: { id: string; name: string; code: string };
    homeRegion: string;
  };
  stats: { charisma: number; competence: number; integrity: number; stamina: number; approval: number; fundraising: number };
  office: { id: string; name: string; region: string; chamber: string | null } | null;
  standing: { approval: number; status: string; officeName: string | null; influence: string };
  careerHistory: Array<{
    id: string; kind: string; title: string; description: string;
    metadataJson: string; week: number; createdAt: number;
  }>;
  achievements: Array<{
    id: string; kind: string; title: string; description: string; unlockedAt: number;
  }>;
  billsSponsored: Array<{
    id: string; title: string; topic: string; stage: string; proposedWeek: number;
  }>;
  elections: Array<{
    id: string; officeId: string; week: number; stage: string; winnerId: string | null;
    officeName: string;
  }>;
  actionLog: Array<{
    id: string; action: string; result: string; week: number; createdAt: number;
  }>;
}

const ACH_ICONS: Record<string, string> = {
  "first-rally": "🎉",
  "first-fundraise": "💰",
  "first-bill": "📜",
  "first-election-win": "🏆",
  "first-vote": "✋",
  "rally-master": "📢",
  "moneybags": "💎",
  "legislator": "⚖️",
  "rising-star": "⭐",
  "people's-champion": "👑",
  "veteran": "🎖️",
  "power-broker": "🏛️",
};

export default function Profile() {
  const { id = "" } = useParams<{ id: string }>();
  const { data, loading, refresh } = useApi<ProfileData>({ url: `/api/profile/${id}`, pollIntervalMs: 10000 });

  if (loading && !data) return <AppShell><p>Loading profile…</p></AppShell>;
  if (!data) return <AppShell><p>Politician not found.</p></AppShell>;

  const { politician: p, bio, stats, office, standing, careerHistory, achievements, billsSponsored, elections } = data;

  return (
    <AppShell>
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">
            {p.ideology} • {bio.country.name} • {p.homeRegion} • {office ? office.name : p.status}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/actions/${p.id}`}><Activity className="h-4 w-4" /> Actions Hub</Link>
        </Button>
      </div>

      <Tabs defaultValue="bio" className="mt-4">
        <TabsList>
          <TabsTrigger value="bio"><User className="mr-1 h-4 w-4" /> Bio</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="mr-1 h-4 w-4" /> Stats</TabsTrigger>
          <TabsTrigger value="standing"><TrendingUp className="mr-1 h-4 w-4" /> Political Standing</TabsTrigger>
          <TabsTrigger value="career"><Clock className="mr-1 h-4 w-4" /> Career History</TabsTrigger>
          <TabsTrigger value="achievements"><Award className="mr-1 h-4 w-4" /> Achievements</TabsTrigger>
        </TabsList>

        {/* BIO TAB */}
        <TabsContent value="bio" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Character Bio</CardTitle><CardDescription>Who is {p.name}?</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <BioRow label="Name" value={p.name} />
              <BioRow label="Age" value={String(bio.age)} />
              <BioRow label="Gender" value={bio.gender} />
              <BioRow label="Ethnicity" value={bio.ethnicity} />
              <BioRow label="Home Region" value={bio.homeRegion} />
              <BioRow label="Country" value={bio.country.name} />
              <BioRow label="Ideology" value={<Badge variant="outline">{p.ideology}</Badge>} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Party</span>
                {bio.party ? (
                  <span className="flex items-center gap-2 font-medium">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: bio.party.color }} />
                    {bio.party.name}
                  </span>
                ) : <span className="text-muted-foreground">Independent</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Political Identity</CardTitle><CardDescription>Where {p.name} stands on the spectrum.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={p.status === "elected" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Office</span>
                <span className="font-medium">{office ? office.name : "None held"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chamber</span>
                <span className="font-medium">{office?.chamber ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entered politics</span>
                <span className="font-medium">Week {p.createdAt}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Approval" value={`${Math.round(stats.approval)}%`} desc="Public perception" />
            <StatCard label="Charisma" value={stats.charisma} desc="Campaign effectiveness" />
            <StatCard label="Competence" value={stats.competence} desc="Legislative skill" />
            <StatCard label="Integrity" value={stats.integrity} desc="Scandal resistance" />
            <StatCard label="Stamina" value={stats.stamina} desc="Action capacity" />
            <StatCard label="War Chest" value={`$${(stats.fundraising / 1000).toFixed(0)}k`} desc="Campaign funds" />
          </div>
        </TabsContent>

        {/* POLITICAL STANDING TAB */}
        <TabsContent value="standing" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Current Standing</CardTitle><CardDescription>Where you rank in the political landscape.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <StandingRow label="Approval Rating" value={`${Math.round(standing.approval)}%`} />
              <StandingRow label="Political Status" value={standing.status} />
              <StandingRow label="Office Held" value={standing.officeName ?? "None"} />
              <StandingRow label="Influence Level" value={standing.influence} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Legislative Record</CardTitle><CardDescription>Bills you've sponsored.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {billsSponsored.length === 0 && <p className="text-sm text-muted-foreground">No bills sponsored yet.</p>}
              {billsSponsored.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.topic}</p>
                  </div>
                  <Badge variant="outline">{b.stage}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAREER HISTORY TAB */}
        <TabsContent value="career">
          <Card>
            <CardHeader><CardTitle>Career History</CardTitle><CardDescription>A timeline of your political journey.</CardDescription></CardHeader>
            <CardContent>
              {careerHistory.length === 0 && <p className="text-sm text-muted-foreground">No career events yet. Take actions to build your history.</p>}
              <div className="space-y-3">
                {careerHistory.map((e) => (
                  <div key={e.id} className="flex gap-3 border-l-2 border-primary/30 pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{e.kind}</Badge>
                        <span className="text-xs text-muted-foreground">Week {e.week}</span>
                      </div>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-sm text-muted-foreground">{e.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACHIEVEMENTS TAB */}
        <TabsContent value="achievements">
          <div className="grid gap-4 md:grid-cols-3">
            {achievements.length === 0 && (
              <Card className="md:col-span-3">
                <CardContent className="pt-6 text-center">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">No achievements yet. Take actions to unlock them!</p>
                </CardContent>
              </Card>
            )}
            {achievements.map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-2 pt-6 text-center">
                  <div className="text-4xl">{ACH_ICONS[a.kind] ?? "🏅"}</div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  <Badge variant="outline" className="text-[10px]">Unlocked Week {Math.round(a.unlockedAt / (60 * 60 * 1000))}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function BioRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatCard({ label, value, desc }: { label: string; value: string | number; desc: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}

function StandingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
