import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Settings, 
  Play, 
  Pause, 
  FastForward, 
  Rewind, 
  Globe, 
  TrendingUp, 
  AlertCircle,
  Activity,
  Users,
  Building2,
  Clock,
  RefreshCw,
  Globe2,
  Vote,
  FileText,
  LogIn,
  LogOut,
  BarChart3
} from "lucide-react";

export default function RunPage() {
  const { data: world, loading, refresh } = useApi<{
    id: string; currentWeek: number; lastTickAt: number; isPaused: number; tickSpeedMultiplier: number;
  }>({ url: "/api/world", pollIntervalMs: 5000 });

  const updateWorld = async (updates: Record<string, any>) => {
    try {
      const res = await fetch("/api/world/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("World state updated");
      await refresh();
    } catch (e) {
      toast.error("Failed to update world");
    }
  };

  if (loading && !world) return <AppShell><p>Loading world state…</p></AppShell>;
  if (!world) return <AppShell><p>World state not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard"><RefreshCw className="h-4 w-4" /> Back to Dashboard</Link></Button>
        <div>
          <h1 className="text-3xl font-semibold">World Control</h1>
          <p className="text-sm text-muted-foreground">Simulation Master Settings</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4" /> Simulation State</CardTitle>
            <CardDescription>Control the flow of time and simulation status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Simulation Paused</Label>
                <p className="text-xs text-muted-foreground">Stop all world progression.</p>
              </div>
              <Switch 
                checked={world.isPaused === 1} 
                onCheckedChange={(val: boolean) => updateWorld({ isPaused: val ? 1 : 0 })} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tick Speed Multiplier</Label>
                <span className="text-sm font-medium">{world.tickSpeedMultiplier}x</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => updateWorld({ tickSpeedMultiplier: Math.max(1, world.tickSpeedMultiplier - 1) })}><Pause className="h-3 w-3" /></Button>
                <Input 
                  type="number" 
                  className="text-center h-8" 
                  value={world.tickSpeedMultiplier} 
                  onChange={(e) => updateWorld({ tickSpeedMultiplier: parseFloat(e.target.value) || 1 })} 
                />
                <Button variant="outline" size="sm" onClick={() => updateWorld({ tickSpeedMultiplier: world.tickSpeedMultiplier + 1 })}><FastForward className="h-3 w-3" /></Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Current Game Time</p>
              <div className="text-2xl font-mono font-bold">Week {world.currentWeek}</div>
              <p className="text-xs text-muted-foreground">Last tick: {new Date(world.lastTickAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> World Maintenance</CardTitle>
            <CardDescription>Trigger administrative resets and seeding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start gap-2" 
              variant="destructive" 
              onClick={() => {
                if (confirm("Wipe all politicians and reset the world?")) {
                  fetch("/api/world/reset", { method: "POST" }).then(() => {
                    toast.success("World reset complete");
                    refresh();
                  });
                }
              }}
            >
              <RefreshCw className="h-4 w-4" /> Reset World Data
            </Button>
            <Button 
              className="w-full justify-start gap-2"
              onClick={() => {
                fetch("/api/world/seed-npcs", { method: "POST" }).then(() => {
                  toast.success("NPCs re-seeded");
                  refresh();
                });
              }}
            >
              <UserPlus className="h-4 w-4" /> Re-seed NPCs
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function UserPlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="17" y2="11" />
    </svg>
  );
}