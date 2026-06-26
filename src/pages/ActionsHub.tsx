import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import { fetchApi } from "@/lib/fetchClient";
import { toast } from "sonner";
import {
  ArrowLeft, Megaphone, HandCoins, FileText, Heart, UserX, Vote, Activity, Clock, Zap, TrendingUp,
} from "lucide-react";

interface PoliticianData {
  politician: {
    id: string; name: string; status: string;
    stats: { charisma: number; competence: number; integrity: number; stamina: number; approval: number; fundraising: number };
  };
}

interface ActionsData {
  actions: Array<{
    id: string; action: string; result: string; week: number; createdAt: number;
    statsBefore: Record<string, number>; statsAfter: Record<string, number>;
  }>;
  counts: Record<string, number>;
}

export default function ActionsHub() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: polData, loading: polLoading, refresh: refreshPol } = useApi<PoliticianData>({ url: `/api/politicians/${id}`, pollIntervalMs: 8000 });
  const { data: actData, refresh: refreshAct } = useApi<ActionsData>({ url: `/api/actions/${id}`, pollIntervalMs: 8000 });
  const [acting, setActing] = useState(false);

  if (polLoading && !polData) return <AppShell><p>Loading…</p></AppShell>;
  if (!polData) return <AppShell><p>Politician not found.</p></AppShell>;

  const p = polData.politician;
  const actions = actData?.actions ?? [];
  const counts = actData?.counts ?? {};

  async function act(action: string, payload: Record<string, unknown> = {}) {
    setActing(true);
    try {
      const res = await fetchApi(`/api/politicians/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Action failed");
      } else {
        toast.success(data.message ?? "Done");
        if (data.newAchievements?.length > 0) {
          toast.success(`🏆 Achievement unlocked: ${data.newAchievements.join(", ")}`, { duration: 6000 });
        }
        refreshPol();
        refreshAct();
      }
    } finally {
      setActing(false);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="sm" asChild><Link to={`/profile/${id}`}><ArrowLeft className="h-4 w-4" /> Back to Profile</Link></Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{p.name}</h1>
          <p className="text-sm text-muted-foreground">Actions Hub — Manage your politician's activities</p>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="grid gap-3 grid-cols-3 md:grid-cols-6 mb-6">
        <MiniStat label="Approval" value={`${Math.round(p.stats.approval)}%`} />
        <MiniStat label="Stamina" value={p.stats.stamina} />
        <MiniStat label="War Chest" value={`$${(p.stats.fundraising / 1000).toFixed(0)}k`} />
        <MiniStat label="Rallies" value={counts.rally ?? 0} />
        <MiniStat label="Fundraisers" value={counts.fundraise ?? 0} />
        <MiniStat label="Bills" value={counts["propose-bill"] ?? 0} />
      </div>

      <Tabs defaultValue="actions" className="mt-2">
        <TabsList>
          <TabsTrigger value="actions"><Zap className="mr-1 h-4 w-4" /> Take Action</TabsTrigger>
          <TabsTrigger value="history"><Clock className="mr-1 h-4 w-4" /> Action History</TabsTrigger>
        </TabsList>

        {/* TAKE ACTION TAB */}
        <TabsContent value="actions" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title="Run Campaign Rally"
            description={`Boosts approval in ${p.name.split(" ").slice(-1)[0]}'s region. Costs 10 stamina & $5k.`}
            icon={<Megaphone className="h-5 w-5 text-primary" />}
            disabled={acting || p.stats.stamina < 10 || p.stats.fundraising < 5000 || p.status === "retired"}
            cta="Hold Rally"
            onClick={() => act("rally")}
          />
          <ActionCard
            title="Fundraise"
            description="Call donors, host dinners. Raises $25k-$75k. Costs 5 stamina."
            icon={<HandCoins className="h-5 w-5 text-primary" />}
            disabled={acting || p.stats.stamina < 5 || p.status === "retired"}
            cta="Fundraise"
            onClick={() => act("fundraise")}
          />
          <ActionCard
            title="Propose a Bill"
            description="Draft legislation on any topic. Goes through committee then floor vote."
            icon={<FileText className="h-5 w-5 text-primary" />}
            disabled={acting || p.status === "retired"}
            cta="Draft Bill"
            onClick={() => {
              const title = window.prompt("Bill title?");
              const summary = window.prompt("One-line summary?");
              const topic = window.prompt("Topic (economy, healthcare, education, environment, immigration, defense, civil-rights, taxation, housing, transportation, foreign-affairs, crime)?");
              if (title && summary && topic) act("propose-bill", { title, summary, topic });
            }}
          />
          <ActionCard
            title="Rest & Recover"
            description="Take a break. Recovers 15-30 stamina. No cost."
            icon={<Heart className="h-5 w-5 text-primary" />}
            disabled={acting || p.status === "retired"}
            cta="Rest"
            onClick={() => act("rest")}
          />
          <ActionCard
            title="Cast a Vote"
            description="Vote yes/no/abstain on a bill in your chamber."
            icon={<Vote className="h-5 w-5 text-primary" />}
            disabled={acting || p.status === "retired"}
            cta="Vote"
            onClick={() => {
              const billId = window.prompt("Bill ID?");
              const vote = window.prompt("Vote: yes / no / abstain?")?.toLowerCase();
              if (billId && vote && ["yes", "no", "abstain"].includes(vote)) act("vote-bill", { billId, vote });
            }}
          />
          <ActionCard
            title="Retire"
            description="Step away from politics. Your record stays."
            icon={<UserX className="h-5 w-5 text-primary" />}
            disabled={acting || p.status === "retired"}
            cta="Retire"
            onClick={() => { if (window.confirm("Retire this politician?")) act("retire"); }}
          />
        </TabsContent>

        {/* ACTION HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Action History</CardTitle>
              <CardDescription>Every action your politician has taken, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {actions.length === 0 && <p className="text-sm text-muted-foreground">No actions taken yet. Start campaigning!</p>}
              <div className="space-y-2">
                {actions.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
                        <span className="text-xs text-muted-foreground">Week {a.week}</span>
                      </div>
                      <p className="font-medium mt-1">{a.result}</p>
                      {a.statsAfter && Object.keys(a.statsAfter).length > 0 && (
                        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                          {a.statsAfter.approval !== a.statsBefore?.approval && (
                            <span>Approval: {a.statsBefore?.approval ?? "—"} → {a.statsAfter.approval}</span>
                          )}
                          {a.statsAfter.stamina !== a.statsBefore?.stamina && (
                            <span>Stamina: {a.statsBefore?.stamina ?? "—"} → {a.statsAfter.stamina}</span>
                          )}
                          {a.statsAfter.fundraising !== a.statsBefore?.fundraising && (
                            <span>War Chest: ${((a.statsBefore?.fundraising ?? 0) / 1000).toFixed(0)}k → ${(a.statsAfter.fundraising / 1000).toFixed(0)}k</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ActionCard({ title, description, icon, cta, disabled, onClick }: {
  title: string; description: string; icon: React.ReactNode; cta: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2">{icon}<p className="font-semibold">{title}</p></div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button onClick={onClick} disabled={disabled} className="w-full">{cta}</Button>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
