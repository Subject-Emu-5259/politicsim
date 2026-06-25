import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Globe2, Vote, FileText, Building2, UserPlus, TrendingUp, Coins, Users,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";

const PILLARS = [
  { icon: <Vote className="h-6 w-6 text-primary" />, title: "Real-time elections", body: "Campaigns, debates, fundraising, polling, and turnout — all evolving every game week." },
  { icon: <FileText className="h-6 w-6 text-primary" />, title: "Full legislative pipeline", body: "Draft, co-sponsor, committee, floor vote, signature. Bills move through real chambers." },
  { icon: <Building2 className="h-6 w-6 text-primary" />, title: "Living parties & coalitions", body: "Form parties, win majorities, build coalitions, survive no-confidence votes." },
  { icon: <TrendingUp className="h-6 w-6 text-primary" />, title: "Macro & demographics", body: "GDP, inflation, unemployment, and demographic approval shift in response to policy." },
  { icon: <Coins className="h-6 w-6 text-primary" />, title: "Strategy & fundraising", body: "Allocate budget across ads, rallies, and ground game. Compete for donor dollars." },
  { icon: <Users className="h-6 w-6 text-primary" />, title: "AI opponents & allies", body: "Persistent NPCs run campaigns, hold seats, and react to your moves." },
];

export default function Landing() {
  return (
    <AppShell>
      <section className="grid gap-10 py-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> Browser-based · Multiplayer · Persistent
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Run for office.<br />Pass the bill.<br />Run the country.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            PolitySim is a political and economic sandbox where you create politicians, campaign in real elections, draft legislation, and steer simulated democracies — while one real hour equals one game week.
          </p>
          <div className="mt-7 flex gap-3">
            <Button asChild size="lg">
              <Link to="/register"><UserPlus className="h-4 w-4" /> Create an account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="space-y-3 p-6 text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Game clock</div>
            <div className="font-mono text-3xl">1 real hour = 1 game week</div>
            <p className="text-muted-foreground">
              Bills move through legislatures, demographics react to policy, and elections arrive on schedule — whether you are online or not.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-3">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <CardContent className="space-y-2 p-5">
              {p.icon}
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}