import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { AHDPageHeader, AHDPanel, AHDTag } from "@/components/ahd/primitives";
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
      <AHDPageHeader tag="🏛️ CONGRESS" title="Legislation" subtitle={`${bills.length} bills in pipeline`} />

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
              <AHDPanel key={b.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="ahd-h3">{b.title}</div>
                  <AHDTag tone="stage">{b.stage}</AHDTag>
                </div>
                <div className="ahd-meta mt-1.5">{b.summary}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AHDTag tone="default">{b.topic}</AHDTag>
                  <AHDTag tone="country">🌍 {b.countryId.toUpperCase()}</AHDTag>
                </div>
                <div className="ahd-meta mt-2">Sponsored by {b.sponsorName ?? "—"} • w{b.proposedWeek}</div>
              </AHDPanel>
            ))}
            {list.length === 0 && <p className="ahd-meta">No bills in this stage.</p>}
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}