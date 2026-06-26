import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import { Search, Users } from "lucide-react";

interface PoliticianListItem {
  id: string; name: string; countryId: string; partyId: string | null;
  ideology: string; status: string; officeId: string | null; homeRegion: string;
  stats: { approval: number; charisma: number; competence: number; fundraising: number };
  demographics: { age: number; gender: string; ethnicity: string };
}

export default function Politicians() {
  const { data } = useApi<{ politicians: PoliticianListItem[] }>({ url: "/api/politicians?limit=200", pollIntervalMs: 10000 });
  const [search, setSearch] = useState("");

  const filtered = data?.politicians.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.homeRegion.toLowerCase().includes(search.toLowerCase()) ||
    p.ideology.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="text-3xl font-semibold">Politicians</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} politicians across all countries.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, region, ideology..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link key={p.id} to={`/politicians/${p.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between pt-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <Badge variant={p.status === "elected" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.ideology} • {p.homeRegion} • {p.demographics.age}yo {p.demographics.gender}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={p.stats.approval >= 50 ? "default" : "secondary"}>
                    {Math.round(p.stats.approval)}%
                  </Badge>
                  {p.stats.fundraising > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">${(p.stats.fundraising / 1000).toFixed(0)}k</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No politicians found.</p>
        </div>
      )}
    </AppShell>
  );
}
