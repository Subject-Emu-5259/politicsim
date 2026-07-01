import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { AHDPageHeader, AHDPanel, AHDTag } from "@/components/ahd/primitives";
import { BookOpen, Users, Vote, Landmark, TrendingUp, Globe2, Award, Zap } from "lucide-react";

const WIKI_SECTIONS = [
  { icon: <Users className="h-5 w-5 text-primary" />, title: "Politicians", desc: "How to create, manage, and grow your political character.", items: ["Character Creation", "Stats & Attributes", "Actions & Behavior", "Career History", "Achievements"] },
  { icon: <Vote className="h-5 w-5 text-primary" />, title: "Elections", desc: "Running for office, campaigning, and winning elections.", items: ["Election Cycles", "Campaign Strategy", "Primary vs General", "Vote Share Calculation", "Multi-seat Races"] },
  { icon: <Landmark className="h-5 w-5 text-primary" />, title: "Congress", desc: "The legislative pipeline — from bill to law.", items: ["Bill Stages", "Committee Review", "Floor Votes", "Sponsorship", "Policy Effects"] },
  { icon: <Globe2 className="h-5 w-5 text-primary" />, title: "Countries", desc: "Simulated nations and their political systems.", items: ["United States", "United Kingdom", "Japan", "Germany", "Ireland", "China"] },
  { icon: <TrendingUp className="h-5 w-5 text-primary" />, title: "Economy", desc: "GDP, unemployment, inflation, and market dynamics.", items: ["Macroeconomic Indicators", "Policy Effects on Economy", "Demographics & Preferences", "Approval Drift"] },
  { icon: <Zap className="h-5 w-5 text-primary" />, title: "Actions", desc: "Everything your politician can do each turn.", items: ["Rally", "Fundraise", "Propose Bill", "Vote on Bill", "Rest", "Retire", "Cabinet Actions"] },
  { icon: <Award className="h-5 w-5 text-primary" />, title: "Achievements", desc: "Milestones and unlockable badges.", items: ["First Rally", "First Fundraise", "First Bill", "Election Winner", "High Approval", "War Chest Millionaire"] },
  { icon: <BookOpen className="h-5 w-5 text-primary" />, title: "Reference", desc: "Technical details and game mechanics.", items: ["Time Scale", "Tick Engine", "NPC Behavior", "Game Clock", "Data Model"] },
];

export default function Wiki() {
  return (
    <AppShell>
      <AHDPageHeader tag="📖 WIKI" title="Knowledge Base" subtitle="Everything you need to know about PolitySim" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {WIKI_SECTIONS.map((section) => (
          <AHDPanel key={section.title} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg leading-none text-amber-500">{section.icon}</span>
              <div className="ahd-h3">{section.title}</div>
            </div>
            <div className="ahd-meta mb-3">{section.desc}</div>
            <div className="ahd-divider mb-3" />
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item}>
                  <Link
                    to="#"
                    onClick={(e) => e.preventDefault()}
                    className="ahd-link flex items-center gap-2 text-xs py-1"
                  >
                    <span className="text-amber-600/60">▸</span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <AHDTag tone="amber">{section.items.length} entries</AHDTag>
            </div>
          </AHDPanel>
        ))}
      </div>
    </AppShell>
  );
}
