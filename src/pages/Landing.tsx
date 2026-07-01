import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Globe2, Vote, FileText, Building2, UserPlus, TrendingUp, Coins, Users, ChevronRight,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { AHDPageHeader, AHDPanel, AHDTag } from "@/components/ahd/primitives";

const PILLARS = [
  { emoji: "🗳", title: "Real-time elections", body: "Campaigns, debates, fundraising, polling, and turnout — all evolving every game week." },
  { emoji: "📜", title: "Full legislative pipeline", body: "Draft, co-sponsor, committee, floor vote, signature. Bills move through real chambers." },
  { emoji: "🏛", title: "Living parties & coalitions", body: "Form parties, win majorities, build coalitions, survive no-confidence votes." },
  { emoji: "📈", title: "Macro & demographics", body: "GDP, inflation, unemployment, and demographic approval shift in response to policy." },
  { emoji: "💰", title: "Strategy & fundraising", body: "Allocate budget across ads, rallies, and ground game. Compete for donor dollars." },
  { emoji: "🤖", title: "AI opponents & allies", body: "Persistent NPCs run campaigns, hold seats, and react to your moves." },
];

export default function Landing() {
  return (
    <AppShell>
      <section className="ahd-frame py-10">
        <AHDPageHeader
          tag="🌐 POLITYSIM"
          title="Run for office. Pass the bill. Run the country."
          subtitle="Browser-based · Multiplayer · Persistent"
        />

        <div className="grid gap-6 mt-6 lg:grid-cols-[1.2fr_1fr]">
          <AHDPanel className="p-6">
            <p className="text-lg text-zinc-200 leading-relaxed">
              PolitySim is a political and economic sandbox where you create politicians,
              campaign in real elections, draft legislation, and steer simulated democracies —
              while <span className="text-amber-300 font-mono">1 real hour = 1 game week</span>.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link to="/register"><UserPlus className="h-4 w-4" /> Create an account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </AHDPanel>

          <AHDPanel className="p-6">
            <div className="ahd-tag mb-2 inline-flex">⏱ GAME CLOCK</div>
            <div className="ahd-stat-value text-3xl">1 real hour = 1 game week</div>
            <p className="ahd-meta mt-3 leading-relaxed">
              Bills move through legislatures, demographics react to policy, and elections
              arrive on schedule — whether you are online or not.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AHDTag tone="amber">Persistent</AHDTag>
              <AHDTag tone="amber">Multiplayer</AHDTag>
              <AHDTag tone="amber">Real-time</AHDTag>
            </div>
          </AHDPanel>
        </div>
      </section>

      <section className="mt-10">
        <AHDPageHeader tag="🏛 PILLARS" title="What you do" subtitle="Six core loops. Each ticks in real time." />
        <div className="grid gap-3 md:grid-cols-3 mt-4">
          {PILLARS.map((p) => (
            <AHDPanel key={p.title} className="p-5">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{p.emoji}</span>
                <h3 className="ahd-h3">{p.title}</h3>
              </div>
              <p className="ahd-meta mt-2 leading-relaxed">{p.body}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-amber-500/70 font-mono">
                <span>EXPLORE</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </AHDPanel>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
