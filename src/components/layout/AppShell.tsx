import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, type ReactNode, useState } from "react";
import {
  Globe2, Vote, FileText, Building2, UserPlus, LogIn, LogOut,
  Activity, BarChart3, Users, Landmark, BookOpen, TrendingUp, User, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

// ─── Wire Ticker (AHD-style scrolling event feed) ───
function WireTicker() {
  const { events } = useLiveEvents(20);
  const [paused, setPaused] = useState(false);

  if (events.length === 0) {
    return (
      <div className="ahd-frame border-x-0 border-t-0 text-[10px] py-1 px-4 overflow-hidden" style={{ background: "#0c0a08" }}>
        <span className="ahd-mono text-[#d8a657] font-bold mr-3">WIRE</span>
        <span className="text-[#8a7f6c]">— Awaiting the first tick…</span>
      </div>
    );
  }

  return (
    <div
      className="text-[10px] py-1 px-4 border-b overflow-hidden whitespace-nowrap ahd-mono"
      style={{ background: "#0c0a08", borderColor: "#3a2f1f" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="text-[#d8a657] font-bold mr-3 tracking-widest">WIRE</span>
      <span
        className={cn("inline-block", !paused && "wire-track")}
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {events.map((e, i) => (
          <span key={e.id} className="mr-8">
            <span className="text-[#8a7f6c]">[{e.kind}]</span>{" "}
            <span className="text-[#d8cdb8]">{e.message}</span>
            {i < events.length - 1 && <span className="text-[#3a2f1f] mx-4">·</span>}
          </span>
        ))}
      </span>
    </div>
  );
}

// ─── Footer Bar (game-state bar — AHD style) ───
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
    <footer className="game-footer-bar border-t" style={{ background: "#0c0a08", borderColor: "#3a2f1f" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-1.5 text-[10px] ahd-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#d8cdb8]">
            <Activity className="h-3 w-3 text-[#6f9c7a] animate-pulse" />
            <span>WEEK {week}</span>
            {gameDate !== "—" && <span className="text-[#8a7f6c]">· {gameDate}</span>}
          </span>
          {nextTickMin && (
            <span className="text-[#8a7f6c]">
              · NEXT TICK {nextTickMin}m
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[#8a7f6c]">
          {user && (
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {user.displayName}
            </span>
          )}
          <span>POLITYSIM · 1 real hour = 1 game week</span>
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

  return (
    <div className="min-h-screen flex flex-col ahd-backplate text-foreground">
      {/* Top bar: terminal chrome with brand + system info */}
      <div className="border-b" style={{ background: "#0c0a08", borderColor: "#3a2f1f" }}>
        <div className="mx-auto max-w-7xl px-6 py-1 flex items-center justify-between text-[10px] ahd-mono text-[#8a7f6c]">
          <span className="flex items-center gap-3">
            <span className="text-[#d8a657]">●</span>
            <span>SYSTEM ONLINE</span>
            <span className="opacity-50">·</span>
            <span>SIMULATION ENGINE v0.3.6</span>
          </span>
          <span className="flex items-center gap-3">
            <Calendar className="h-3 w-3" />
            <span>{new Date().toUTCString().slice(5, 22)} UTC</span>
          </span>
        </div>
      </div>

      {/* WIRE ticker */}
      <WireTicker />

      {/* Main header: brand + nav + auth */}
      <header className="sticky top-0 z-40 border-b" style={{ background: "#0c0a08", borderColor: "#3a2f1f" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 border flex items-center justify-center" style={{ borderColor: "#d8a657", background: "rgba(216, 166, 87, 0.08)" }}>
              <Globe2 className="h-4 w-4" style={{ color: "#d8a657" }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="ahd-mono font-bold tracking-widest text-[#d8a657]">POLITYSIM</span>
              <span className="ahd-mono text-[9px] text-[#8a7f6c] tracking-wider">POLITICAL &amp; ECONOMIC SIMULATION</span>
            </div>
          </Link>

          {/* AHD-style nav: tabbed row with brass borders */}
          <nav className="ahd-tabs-list">
            <NavItem to="/politicians" icon={<Users className="h-3.5 w-3.5" />}>Politicians</NavItem>
            <NavItem to="/elections" icon={<Vote className="h-3.5 w-3.5" />}>Elections</NavItem>
            <NavItem to="/legislation" icon={<Landmark className="h-3.5 w-3.5" />}>Congress</NavItem>
            <NavItem to="/world" icon={<Globe2 className="h-3.5 w-3.5" />}>World</NavItem>
            <NavItem to="/markets" icon={<TrendingUp className="h-3.5 w-3.5" />}>Markets</NavItem>
            <NavItem to="/wiki" icon={<BookOpen className="h-3.5 w-3.5" />}>Wiki</NavItem>
            <NavItem to="/polls" icon={<BarChart3 className="h-3.5 w-3.5" />}>Polls</NavItem>
          </nav>

          {/* Right side: auth + profile */}
          <div className="flex items-center gap-2 ahd-mono text-[10px]">
            {user ? (
              <>
                <Link
                  to={`/profile/${user.id}`}
                  className="px-2.5 py-1 border flex items-center gap-1.5 hover:border-[#d8a657] transition-colors"
                  style={{ borderColor: "#3a2f1f", color: "#d8cdb8" }}
                >
                  <User className="h-3 w-3" />
                  <span className="uppercase tracking-wider">{user.displayName}</span>
                </Link>
                <button
                  onClick={async () => { logout(); navigate("/"); }}
                  className="px-2.5 py-1 border flex items-center gap-1.5 hover:border-[#c1453a] hover:text-[#c1453a] transition-colors"
                  style={{ borderColor: "#3a2f1f", color: "#8a7f6c" }}
                  title="Log out"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-2.5 py-1 border flex items-center gap-1.5 hover:border-[#d8a657] transition-colors uppercase tracking-wider"
                  style={{ borderColor: "#3a2f1f", color: "#d8cdb8" }}
                >
                  <LogIn className="h-3 w-3" />
                  <span>Sign in</span>
                </Link>
                <Link
                  to="/register"
                  className="px-2.5 py-1 border flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                  style={{ borderColor: "#d8a657", color: "#d8a657", background: "rgba(216, 166, 87, 0.08)" }}
                >
                  <UserPlus className="h-3 w-3" />
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">
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
      className="ahd-tab"
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}
