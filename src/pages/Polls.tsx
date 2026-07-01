import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import { Link } from "react-router-dom";

interface PollOptionSet {
  approve: number;
  disapprove: number;
  undecided: number;
}

interface Poll {
  id: string;
  countryId: string;
  week: number;
  topic: string;
  options: PollOptionSet;
  sampleSize: number;
  marginOfError: number;
}

const TOPIC_LABELS: Record<string, string> = {
  economy: "Economy",
  healthcare: "Healthcare",
  education: "Education",
  environment: "Environment",
  immigration: "Immigration",
  defense: "Defense",
  "civil-rights": "Civil Rights",
  taxation: "Taxation",
  housing: "Housing",
  transportation: "Transportation",
  "foreign-affairs": "Foreign Affairs",
  crime: "Crime",
};

function TrendArrow({ delta }: { delta: number | null }) {
  if (delta === null) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (delta > 0.5) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (delta < -0.5) return <TrendingDown className="h-3 w-3 text-rose-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function formatDelta(delta: number | null): string {
  if (delta === null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
}

export default function Polls() {
  const { data } = useApi<{ polls: Poll[] }>({
    url: "/api/polls?limit=200",
    pollIntervalMs: 60000,
  });
  const polls = data?.polls ?? [];

  // Group: latest poll per (country, topic)
  const latest = useMemo(() => {
    const m = new Map<string, Poll>();
    for (const p of polls) {
      const key = `${p.countryId}:${p.topic}`;
      const cur = m.get(key);
      if (!cur || p.week > cur.week) m.set(key, p);
    }
    return [...m.values()].sort((a, b) => a.topic.localeCompare(b.topic));
  }, [polls]);

  // Group: history per (country, topic), in ascending week order
  const historyByTopic = useMemo(() => {
    const m = new Map<string, Poll[]>();
    for (const p of polls) {
      const key = `${p.countryId}:${p.topic}`;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.week - b.week);
    return m;
  }, [polls]);

  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const currentTopic = activeTopic ?? latest[0]?.topic ?? null;
  const currentPoll =
    currentTopic ? latest.find((p) => p.topic === currentTopic) : null;
  const currentHistory = currentPoll
    ? historyByTopic.get(`${currentPoll.countryId}:${currentPoll.topic}`) ?? []
    : [];

  // Trend = current.approve - previous.approve
  const trend = currentHistory.length >= 2
    ? currentHistory[currentHistory.length - 1].options.approve -
      currentHistory[currentHistory.length - 2].options.approve
    : null;

  return (
    <AppShell>
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-semibold">Polls</h1>
        <span className="text-sm text-muted-foreground">Public opinion across policy topics</span>
      </div>

      <Tabs defaultValue="latest" className="mt-6">
        <TabsList>
          <TabsTrigger value="latest">
            <BarChart3 className="mr-1 h-4 w-4" /> Latest
          </TabsTrigger>
          <TabsTrigger value="history" disabled={!currentPoll}>
            <TrendingUp className="mr-1 h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="latest" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {latest.map((p) => {
            const hist = historyByTopic.get(`${p.countryId}:${p.topic}`) ?? [];
            const d =
              hist.length >= 2
                ? hist[hist.length - 1].options.approve -
                  hist[hist.length - 2].options.approve
                : null;
            return (
              <Card
                key={p.id}
                className="cursor-pointer transition hover:border-primary"
                onClick={() => setActiveTopic(p.topic)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {TOPIC_LABELS[p.topic] ?? p.topic}
                      </CardTitle>
                      <CardDescription>
                        <Link
                          to={`/countries/${p.countryId}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.countryId.toUpperCase()}
                        </Link>{" "}
                        • w{p.week}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendArrow delta={d} />
                      <span className="font-mono text-muted-foreground">{formatDelta(d)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ApproveBar approve={p.options.approve} />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>
                      <strong className="text-foreground">{p.options.approve.toFixed(1)}%</strong>{" "}
                      approve
                    </span>
                    <span>{p.options.disapprove.toFixed(1)}% disapprove</span>
                    <span>±{p.marginOfError}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {latest.length === 0 && (
            <p className="text-sm text-muted-foreground md:col-span-3">
              No polls yet. The tick engine samples public opinion every game week.
            </p>
          )}
        </TabsContent>

        <TabsContent value="history">
          {currentPoll ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      {TOPIC_LABELS[currentPoll.topic] ?? currentPoll.topic}
                    </CardTitle>
                    <CardDescription>
                      {currentPoll.countryId.toUpperCase()} • last sampled at week{" "}
                      {currentPoll.week} (n = {currentPoll.sampleSize}, ±
                      {currentPoll.marginOfError}%)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendArrow delta={trend} />
                    <span className="font-mono text-sm">
                      {formatDelta(trend)} pts
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Sparkline
                  data={currentHistory.map((h) => ({
                    week: h.week,
                    approve: h.options.approve,
                  }))}
                />
                <table className="mt-4 w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th>Week</th>
                      <th className="text-right">Approve</th>
                      <th className="text-right">Disapprove</th>
                      <th className="text-right">Δ</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {currentHistory
                      .slice()
                      .reverse()
                      .map((h, i, arr) => {
                        const prev = arr[i + 1];
                        const d =
                          prev
                            ? h.options.approve - prev.options.approve
                            : null;
                        return (
                          <tr key={h.id} className="border-t">
                            <td className="py-1">w{h.week}</td>
                            <td className="text-right">{h.options.approve.toFixed(1)}%</td>
                            <td className="text-right">
                              {h.options.disapprove.toFixed(1)}%
                            </td>
                            <td className="text-right">{formatDelta(d)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No poll history yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ApproveBar({ approve }: { approve: number }) {
  const pct = Math.max(0, Math.min(100, approve));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-rose-500/15">
      <div
        className="h-full rounded-full bg-emerald-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Sparkline({ data }: { data: { week: number; approve: number }[] }) {
  if (data.length === 0) return null;
  const w = 600;
  const h = 100;
  const xs = data.map((d) => d.week);
  const ys = data.map((d) => d.approve);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(0, ...ys) - 5;
  const ymax = Math.max(100, ...ys) + 5;
  const sx = (x: number) =>
    xmax === xmin ? w / 2 : ((x - xmin) / (xmax - xmin)) * (w - 20) + 10;
  const sy = (y: number) =>
    h - ((y - ymin) / (ymax - ymin)) * (h - 20) - 10;
  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.week)},${sy(d.approve)}`)
    .join(" ");
  const last = data[data.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line
        x1="10"
        x2={w - 10}
        y1={sy(50)}
        y2={sy(50)}
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeDasharray="4 4"
      />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle
        cx={sx(last.week)}
        cy={sy(last.approve)}
        r="4"
        fill="currentColor"
      />
    </svg>
  );
}
