import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";

interface BillItem {
  id: string;
  title: string;
  summary: string;
  topic: string;
  stage: string;
  countryId: string;
  proposedWeek: number;
  sponsorName: string | null;
}

export default function LegislationPage() {
  const { data: billsRes } = useApi<{ bills: BillItem[] }>({ url: "/api/bills?limit=80", pollIntervalMs: 8000 });
  const bills = billsRes?.bills ?? [];

  const introduced = (bills ?? []).filter((b) => b.stage === "introduced" || b.stage === "drafted");
  const inCommittee = (bills ?? []).filter((b) => b.stage === "committee");
  const onFloor = (bills ?? []).filter((b) => b.stage === "floor-vote");
  const passed = (bills ?? []).filter((b) => b.stage === "passed" || b.stage === "signed");
  const failed = (bills ?? []).filter((b) => b.stage === "rejected" || b.stage === "vetoed");

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Legislation</h1>
      <p className="text-sm text-muted-foreground">Bills moving through chambers.</p>

      <Tabs defaultValue="introduced" className="mt-6">
        <TabsList>
          <TabsTrigger value="introduced"><FileText className="mr-1 h-4 w-4" /> Introduced ({introduced.length})</TabsTrigger>
          <TabsTrigger value="committee"><Clock className="mr-1 h-4 w-4" /> Committee ({inCommittee.length})</TabsTrigger>
          <TabsTrigger value="floor">Floor vote ({onFloor.length})</TabsTrigger>
          <TabsTrigger value="passed"><CheckCircle2 className="mr-1 h-4 w-4" /> Passed ({passed.length})</TabsTrigger>
          <TabsTrigger value="failed"><XCircle className="mr-1 h-4 w-4" /> Failed ({failed.length})</TabsTrigger>
        </TabsList>

        {([["introduced", introduced], ["committee", inCommittee], ["floor", onFloor], ["passed", passed], ["failed", failed]] as const).map(([key, list]) => (
          <TabsContent key={key} value={key} className="grid gap-3 md:grid-cols-2">
            {list.map((b) => (
              <Card key={b.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{b.title}</CardTitle>
                  <CardDescription>{b.summary}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="text-xs text-muted-foreground">Sponsored by {b.sponsorName ?? "—"} • w{b.proposedWeek}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{b.topic}</Badge>
                    <Badge variant="secondary">{b.stage}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {list.length === 0 && <p className="text-sm text-muted-foreground">No bills in this stage.</p>}
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}