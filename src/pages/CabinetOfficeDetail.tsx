import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { 
  Shield, Globe, Zap, Landmark, Building2, 
  Coins, Scale, Activity, FileText, User,
  TrendingUp, ArrowUpRight, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetchClient";

interface OfficeDetail {
  name: string;
  type: string;
  specialization: string;
  budgetUSD: number;
  metrics: Array<{ label: string; value: string; trend: "up" | "down" | "stable" }>;
  actions: Array<{ id: string; title: string; desc: string; cost: number; icon: any }>;
}

export default function CabinetOfficeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, refresh } = useApi<OfficeDetail>({ 
    url: `/api/cabinet/office/${id}`, 
    pollIntervalMs: 10000 
  });
  const [acting, setActing] = useState(false);

  if (!user) return null;
  if (loading && !data) return <AppShell><p>Loading Dossier...</p></AppShell>;
  if (!data) return <AppShell><p>Office not found.</p></AppShell>;

  async function handleAction(actionId: string) {
    setActing(true);
    try {
      const res = await fetchApi(`/api/cabinet/action`, {
        method: "POST",
        body: JSON.stringify({ officeId: id, actionId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Action failed");
      } else {
        toast.success("Order issued successfully");
        await refresh();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActing(false);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 pb-6">
        <Button variant="ghost" size="sm" asChild><Link to="/cabinet"><ArrowUpRight className="h-4 w-4 rotate-180" /> Back to Cabinet</Link></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">Executive Dossier • {data.specialization}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Annual Budget</p>
              <p className="text-2xl font-mono font-bold">${(data.budgetUSD / 1_000_000).toFixed(1)}M</p>
            </CardContent>
          </Card>
          {data.metrics.map((m, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase font-semibold">{m.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{m.value}</p>
                  <span className={`text-xs ${m.trend === "up" ? "text-green-500" : m.trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                    {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="actions" className="mt-4">
          <TabsList>
            <TabsTrigger value="actions">Orders</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="estates">Estates</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="grid gap-4 md:grid-cols-2">
            {data.actions.map(action => (
              <Card key={action.id} className="group hover:border-primary transition-colors">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{action.title}</h3>
                      <Badge variant="outline">{action.cost} AP</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
                    <Button 
                      size="sm" 
                      className="mt-4 w-full" 
                      onClick={() => handleAction(action.id)}
                      disabled={acting}
                    >
                      {acting ? "Issuing..." : "Issue Order"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="budget">
            <Card>
              <CardHeader>
                <CardTitle>Fiscal Allocation</CardTitle>
                <CardDescription>Detailed breakdown of the department's capital and operational spending.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">Budgetary detail coming in the next update.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="estates">
            <Card>
              <CardHeader>
                <CardTitle>Public Estates</CardTitle>
                <CardDescription>Facilities and programs managed by this ministry.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">Estate management system coming in the next update.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Real-time KPIs for the department's core objectives.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">Detailed metrics drilling coming in the next update.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
