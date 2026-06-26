import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, type ReactNode, useState } from "react";
import {
  Globe2, Vote, FileText, Building2, UserPlus, LogIn, LogOut,
  Activity, BarChart3, Users, Landmark, BookOpen, TrendingUp, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

// ─── Wire Ticker ───
// Scrolling event ticker at the top of every page (AHD-style "WIRE")
function WireTicker() {
  const { events } = useLiveEvents(20);
  const [paused, setPaused] = useState(false);

  if (events.length === 0) {
    return (
      <div className="bg-zinc-900 text-zinc-400 text-xs py-1 px-4 border-b border-zinc-800 overflow-hidden">
        <span className="font-mono">WIRE</span> — Awaiting the first tick…
      </div>
    );
  }

  return (
    <div
      className="bg-zinc-900 text-zinc-400 text-xs py-1 px-4 border-b border-zinc-800 overflow-hidden whitespace-nowrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="font-mono text-emerald-500 font-bold mr-3">WIRE</span>
      <span
        className={cn("inline-block", !paused && "animate-[scroll_60s_linear_infinite]")}
        style={{ animation: !paused ? "scroll 60s linear infinite" : "none" }}
      >
        {events.map((e, i) => (
          <span key={e.id} className="mr-8">
            <span className="text-zinc-500">[{e.kind}]</span> {e.message}
            {i < events.length - 1 && <span className="text-zinc-700 mx-4">·</span>}
          </span>
        ))}
      </span>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Footer Bar ───
// Persistent footer with game week, turn timer, players online, profile mini-stats
function FooterBar() {
  const { tick } = useLiveEvents(5);
  const { data: worldRes } = useApi<{ currentWeek: number; gameDate: string; isPaused: boolean; nextTickInMs: number }>({
    url: "/api/world",
    pollIntervalMs: 5000,
  });
  const { user } = useAuth();
  const week = tick ?? worldRes?.currentWeek ?? "—";
  const gameDate = worldRes?.gameDate ?? "—";
  const nextTickMin = worldRes?.nextTickInMs ? Math.ceil(worldRes.nextTickInMs / 60000) : null;

  return (
    <footer className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-6 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span className="font-mono">Week {week}</span>
            {gameDate !== "—" && <span className="opacity-50">· {gameDate}</span>}
          </span>
          {nextTickMin && (
            <span className="flex items-center gap-1 opacity-60">
              <span>Next tick in {nextTickMin}m</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="flex items-center gap-1.5 opacity-70">
              <User className="h-3 w-3" />
              {user.displayName}
            </span>
          )}
          <span className="opacity-40">PolitySim — 1 real hour = 1 game week</span>
        </div>
      </div>
    </footer>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tick } = useLiveEvents(5);

  useEffect(() => {
    document.title = `PolitySim · Week ${tick ?? "—"}`;
  }, [tick]);

  // AHD-style nav: Politicians, Elections, Congress, World, Markets, Wiki, Profile
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* WIRE ticker */}
      <WireTicker />

      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Globe2 className="h-5 w-5 text-primary" />
            <span>PolitySim</span>
          </Link>

          {/* Main nav tabs — matching AHD structure */}
          <nav className="flex items-center gap-1">
            <NavItem to="/politicians" icon={<Users className="h-4 w-4" />}>Politicians</NavItem>
            <NavItem to="/elections" icon={<Vote className="h-4 w-4" />}>Elections</NavItem>
            <NavItem to="/legislation" icon={<Landmark className="h-4 w-4" />}>Congress</NavItem>
            <NavItem to="/world" icon={<Globe2 className="h-4 w-4" />}>World</NavItem>
            <NavItem to="/markets" icon={<TrendingUp className="h-4 w-4" />}>Markets</NavItem>
            <NavItem to="/wiki" icon={<BookOpen className="h-4 w-4" />}>Wiki</NavItem>
          </nav>

          {/* Right side: auth + profile */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">Week {tick ?? "—"}</span>
            {user ? (
              <>
                <span className="hidden md:inline opacity-50">|</span>
                <span className="hidden md:inline">{user.displayName}</span>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/dashboard"><BarChart3 className="h-4 w-4" /> Dashboard</Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => { logout(); navigate("/"); }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/login"><LogIn className="h-4 w-4" /> Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
        {children}
      </main>

      <FooterBar />
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        )
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}
