import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { Globe2, Users, TrendingUp, Activity } from "lucide-react";

interface CountrySummary {
  id: string; code: string; name: string; gdp: number; population: number;
  unemploymentPct: number; inflationPct: number; approvalBaseline: number;
}

export default function World() {
  const { data } = useApi<{ countries: CountrySummary[] }>({ url: "/api/countries", pollIntervalMs: 10000 });

  return (
    <AppShell>
      <div className="pb-4">
        <h1 className="text-3xl font-semibold">World</h1>
        <p className="text-sm text-muted-foreground">All simulated countries and their political state.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.countries.map((c) => (
          <Link key={c.id} to={`/countries/${c.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="h-5 w-5 text-primary" />
                    {c.name}
                  </CardTitle>
                  <Badge variant="outline">{c.code}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="GDP" value={`$${(c.gdp / 1000).toFixed(1)}T`} />
                <Stat icon={<Users className="h-3.5 w-3.5" />} label="Pop" value={`${(c.population / 1e6).toFixed(0)}M`} />
                <Stat icon={<Activity className="h-3.5 w-3.5" />} label="Unemp" value={`${c.unemploymentPct.toFixed(1)}%`} />
                <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Inflation" value={`${c.inflationPct.toFixed(1)}%`} />
                <div className="col-span-2">
                  <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Baseline Approval</span>
                    <Badge variant={c.approvalBaseline >= 50 ? "default" : "secondary"}>
                      {c.approvalBaseline.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
