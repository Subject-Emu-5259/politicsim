import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Megaphone, Vote, FileText, Heart, HandCoins, Pencil, UserX, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";

interface PoliticianDetailData {
  politician: {
    id: string;
    name: string;
    countryId: string;
    partyId: string | null;
    ideology: string;
    status: string;
    officeId: string | null;
    homeRegion: string;
    stats: { charisma: number; competence: number; integrity: number; stamina: number; approval: number; fundraising: number };
  };
  country: { id: string; name: string };
  party: { id: string; name: string; shortName: string; color: string } | null;
  office: { id: string; name: string; region: string; chamber: string | null } | null;
  recentBills: Array<{ id: string; title: string; stage: string; topic: string }>;
  upcomingElections: Array<{ id: string; officeName: string; week: number; stage: string }>;
}

export default function PoliticianDetail() {
  const { id = "" } = useParams();
  const { data, loading, refresh } = useApi<PoliticianDetailData>({ url: `/api/politicians/${id}`, pollIntervalMs: 6000 });
  const [acting, setActing] = useState(false);

  if (loading && !data) return <AppShell><p>Loading…</p></AppShell>;
  if (!data) return <AppShell><p>Politician not found.</p></AppShell>;

  const { politician: p, party, country, office, recentBills, upcomingElections } = data;

  async function act(endpoint: string, payload: Record<string, unknown>) {
    setActing(true);
    try {
      const res = await fetch(`/api/politicians/${id}/${endpoint}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Action failed");
      } else {
        toast.success(data.message ?? "Done");
        await refresh();
      }
    } finally {
      setActing(false);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <div>
          <h1 className="text-3xl font-semibold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">
            {p.ideology} • {country.name} • {p.homeRegion} • {office ? office.name : p.status}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Stat label="Approval" value={`${Math.round(p.stats.approval)}%`} />
        <Stat label="Charisma" value={p.stats.charisma} />
        <Stat label="Competence" value={p.stats.competence} />
        <Stat label="Integrity" value={p.stats.integrity} />
        <Stat label="Stamina" value={p.stats.stamina} />
        <Stat label="War chest" value={`$${(p.stats.fundraising / 1000).toFixed(0)}k`} />
      </div>

      <Tabs defaultValue="actions" className="mt-6">
        <TabsList>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="elections">Elections</TabsTrigger>
          <TabsTrigger value="party">Party</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title="Run campaign rally"
            description={`Costs stamina & fundraising. Raises approval in ${p.homeRegion}.`}
            icon={<Megaphone className="h-5 w-5 text-primary" />}
            disabled={acting || p.stats.fundraising < 5000 || p.stats.stamina < 10}
            cta="Hold rally"
            onClick={() => act("rally", {})}
          />
          <ActionCard
            title="Fundraise"
            description="Party dinners, donor calls. Builds your war chest but consumes stamina."
            icon={<HandCoins className="h-5 w-5 text-primary" />}
            disabled={acting || p.stats.stamina < 5}
            cta="Fundraise"
            onClick={() => act("fundraise", {})}
          />
          <ActionCard
            title="Propose a bill"
            description="Pick a topic and a position. Bills go through committee, then a floor vote."
            icon={<FileText className="h-5 w-5 text-primary" />}
            disabled={acting}
            cta="Open drafter"
            onClick={() => {
              const title = window.prompt("Bill title");
              const summary = window.prompt("One-line summary");
              const topic = window.prompt("Topic (economy, healthcare, education, environment, immigration, defense, civil-rights, taxation, housing, transportation, foreign-affairs, crime)");
              if (title && summary && topic) act("propose-bill", { title, summary, topic });
            }}
          />
          {office && (
            <ActionCard
              title="Cast floor vote on a bill"
              description={`Vote on any ${office.chamber ?? "chamber"} bill in committee or floor vote.`}
              icon={<Vote className="h-5 w-5 text-primary" />}
              disabled={acting}
              cta="Open ballots"
              onClick={() => {
                const billId = window.prompt("Bill id (UUID)");
                const vote = window.prompt("Vote: yes / no / abstain")?.toLowerCase();
                if (billId && vote && ["yes", "no", "abstain"].includes(vote)) {
                  act("vote-bill", { billId, vote });
                }
              }}
            />
          )}
          <ActionCard
            title="Rest"
            description="Recover stamina and integrity. A quiet week."
            icon={<Heart className="h-5 w-5 text-primary" />}
            disabled={acting}
            cta="Rest"
            onClick={() => act("rest", {})}
          />
          <ActionCard
            title="Retire"
            description="Step back from politics. Your bills and seat remain."
            icon={<UserX className="h-5 w-5 text-primary" />}
            disabled={acting}
            cta="Retire"
            onClick={() => {
              if (window.confirm("Retire this politician?")) act("retire", {});
            }}
          />
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardHeader>
              <CardTitle>Bills you sponsored</CardTitle>
              <CardDescription>Recent legislative activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentBills.length === 0 && <p className="text-sm text-muted-foreground">No bills yet.</p>}
              {recentBills.map((b) => (
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

        <TabsContent value="elections">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming elections</CardTitle>
              <CardDescription>Offices you're running for or eligible to enter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingElections.length === 0 && <p className="text-sm text-muted-foreground">No upcoming elections.</p>}
              {upcomingElections.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <p className="font-medium">{e.officeName}</p>
                  <Badge variant="outline">w{e.week} • {e.stage}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="party">
          <Card>
            <CardHeader>
              <CardTitle>Party membership</CardTitle>
              <CardDescription>Your party shapes your base and donors.</CardDescription>
            </CardHeader>
            <CardContent>
              {party ? (
                <div className="flex items-center gap-3">
                  <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: party.color }} />
                  <p className="font-medium">{party.name} ({party.shortName})</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Independent.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, description, icon, cta, disabled, onClick }: { title: string; description: string; icon: React.ReactNode; cta: string; disabled?: boolean; onClick: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2">{icon}<p className="font-semibold">{title}</p></div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button onClick={onClick} disabled={disabled}>{cta}</Button>
      </CardContent>
    </Card>
  );
}