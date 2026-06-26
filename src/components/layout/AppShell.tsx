import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import {
  Globe2, Vote, FileText, Building2, UserPlus, LogIn, LogOut,
  Activity, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { cn } from "@/lib/utils";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tick } = useLiveEvents(5);

  useEffect(() => {
    document.title = `PolitySim · Week ${tick ?? "—"}`;
  }, [tick]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Globe2 className="h-5 w-5 text-primary" />
            <span>PolitySim</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/dashboard" icon={<BarChart3 className="h-4 w-4" />}>Dashboard</NavItem>
            <NavItem to="/elections" icon={<Vote className="h-4 w-4" />}>Elections</NavItem>
            <NavItem to="/legislation" icon={<FileText className="h-4 w-4" />}>Legislation</NavItem>
            <NavLink to="/cabinet" className={({ isActive }) => cn("flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")}>
              <Building2 className="h-4 w-4" /> Cabinet
            </NavLink>
            <NavItem to="/politicians/new" icon={<UserPlus className="h-4 w-4" />}>Run</NavItem>
          </nav>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>Week {tick ?? "—"}</span>
            {user ? (
              <>
                <span className="hidden md:inline opacity-50">|</span>
                <span className="hidden md:inline">{user.displayName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => { await logout(); navigate("/"); }}
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
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        PolitySim — 1 real hour = 1 game week. {new Date().getFullYear()}.
      </footer>
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