import { useMemo, useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus, X, Calendar, Hash, Activity, ChevronUp, ChevronDown } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import { Link } from "react-router-dom";

// AHD-style theme: dark surface, amber accent, monospace numerics, emoji flags.
// Mirrors the visual language of https://www.ahousedividedgame.com
// (DEC VT100 terminal aesthetic, gold-on-black, category tag prefixes).
const AHD = {
  surface: "bg-zinc-950",
  panel: "bg-zinc-900/60 border border-zinc-800",
  text: "text-zinc-200",
  muted: "text-zinc-500",
  mono: "font-mono",
  accent: "text-amber-300",
  accentBg: "bg-amber-400",
  approve: "text-emerald-400",
  disapprove: "text-rose-400",
  undecided: "text-zinc-400",
};

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

const COUNTRY_FLAGS: Record<string, string> = {
  usa: "🇺🇸",
  uk: "🇬🇧",
  germany: "🇩🇪",
  japan: "🇯🇵",
  france: "🇫🇷",
};

const TOPIC_META: Record<string, { label: string; emoji: string; color: string }> = {
  economy: { label: "Economy", emoji: "💵", color: "bg-amber-400" },
  healthcare: { label: "Healthcare", emoji: "⚕️", color: "bg-emerald-400" },
  education: { label: "Education", emoji: "🎓", color: "bg-sky-400" },
  environment: { label: "Environment", emoji: "🌿", color: "bg-green-500" },
  immigration: { label: "Immigration", emoji: "🛂", color: "bg-purple-400" },
  defense: { label: "Defense", emoji: "🛡️", color: "bg-slate-400" },
  "civil-rights": { label: "Civil Rights", emoji: "⚖️", color: "bg-pink-400" },
  taxation: { label: "Taxation", emoji: "💰", color: "bg-yellow-400" },
  housing: { label: "Housing", emoji: "🏘️", color: "bg-orange-400" },
  transportation: { label: "Transportation", emoji: "🛤️", color: "bg-cyan-400" },
  "foreign-affairs": { label: "Foreign Affairs", emoji: "🌐", color: "bg-indigo-400" },
  crime: { label: "Crime", emoji: "🚨", color: "bg-red-400" },
};

function countryFlag(code: string): string {
  return COUNTRY_FLAGS[code.toLowerCase()] ?? "🏳️";
}

function topicMeta(slug: string) {
  return TOPIC_META[slug] ?? { label: slug, emoji: "📊", color: "bg-zinc-400" };
}

function TrendArrow({ delta }: { delta: number | null }) {
  if (delta === null) return <Minus className="h-3 w-3 text-zinc-500" />;
  if (delta > 0.5) return <ChevronUp className="h-3 w-3 text-emerald-400" />;
  if (delta < -0.5) return <ChevronDown className="h-3 w-3 text-rose-400" />;
  return <Minus className="h-3 w-3 text-zinc-500" />;
}

function formatDelta(delta: number | null): string {
  if (delta === null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} pts`;
}

function Sparkline({ values, color = "bg-amber-400" }: { values: number[]; color?: string }) {
  if (values.length < 2) {
    return <div className="h-6 w-full rounded border border-dashed border-zinc-800" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <div className="flex h-6 w-full items-end gap-px">
      {values.map((v, i) => {
        const h = Math.max(8, ((v - min) / range) * 100);
        return <div key={i} className={`${color} flex-1 rounded-sm opacity-80`} style={{ height: `${h}%` }} />;
      })}
    </div>
  );
}

function PollCard({
  poll,
  history,
  onOpenDetail,
}: {
  poll: Poll;
  history: Poll[];
  onOpenDetail: (poll: Poll, history: Poll[]) => void;
}) {
  const meta = topicMeta(poll.topic);
  const flag = countryFlag(poll.countryId);
  const prior = history.find((h) => h.topic === poll.topic && h.week < poll.week);
  const delta = prior ? poll.options.approve - prior.options.approve : null;

  const series = useMemo(() => {
    return history
      .filter((h) => h.topic === poll.topic && h.countryId === poll.countryId)
      .sort((a, b) => a.week - b.week)
      .slice(-8)
      .map((h) => h.options.approve);
  }, [history, poll.topic, poll.countryId]);

  return (
    <button
      onClick={() => onOpenDetail(poll, history)}
      className={`${AHD.panel} rounded-md p-3 text-left transition-all hover:border-amber-500/40 hover:bg-zinc-900/80`}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{meta.emoji}</span>
          <span className={`font-medium ${AHD.text}`}>{meta.label}</span>
        </div>
        <span className={`${AHD.mono} text-[10px] uppercase tracking-wider ${AHD.muted}`}>
          {flag} {poll.countryId}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className={`${AHD.mono} text-2xl font-semibold ${AHD.approve}`}>
            {poll.options.approve.toFixed(1)}%
          </span>
          <div className="flex items-center gap-1">
            <TrendArrow delta={delta} />
            <span className={`${AHD.mono} text-[10px] ${AHD.muted}`}>{formatDelta(delta)}</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: `${poll.options.approve}%` }}
          />
        </div>
      </div>

      <div className={`mt-3 grid grid-cols-2 gap-x-2 gap-y-0.5 ${AHD.mono} text-[10px] ${AHD.muted}`}>
        <div className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${AHD.approve.replace("text-", "bg-")}`} />
          <span>approve {poll.options.approve.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          <span>disapprove {poll.options.disapprove.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Hash className="h-2.5 w-2.5" />
          <span>n = {poll.sampleSize.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="h-2.5 w-2.5" />
          <span>±{poll.marginOfError}%</span>
        </div>
      </div>

      <div className="mt-3">
        <Sparkline values={series} color={meta.color} />
      </div>
    </button>
  );
}

function TopicDetail({
  poll,
  history,
  onClose,
}: {
  poll: Poll;
  history: Poll[];
  onClose: () => void;
}) {
  const meta = topicMeta(poll.topic);
  const flag = countryFlag(poll.countryId);
  const topicHistory = history
    .filter((h) => h.topic === poll.topic && h.countryId === poll.countryId)
    .sort((a, b) => a.week - b.week);

  const stats = useMemo(() => {
    if (topicHistory.length === 0) return null;
    const approves = topicHistory.map((h) => h.options.approve);
    const min = Math.min(...approves);
    const max = Math.max(...approves);
    const avg = approves.reduce((s, v) => s + v, 0) / approves.length;
    return { min, max, avg, count: topicHistory.length };
  }, [topicHistory]);

  return (
    <div className="max-w-2xl border-zinc-800 bg-zinc-950 text-zinc-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-300">
          <span className="text-xl">{meta.emoji}</span>
          <span className={AHD.mono}>{meta.label}</span>
          <span className={`${AHD.mono} text-xs ${AHD.muted}`}>
            {flag} {poll.countryId.toUpperCase()}
          </span>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-zinc-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={`${AHD.mono} text-xs ${AHD.muted}`}>
        Last sampled at week {poll.week} • n = {poll.sampleSize.toLocaleString()} • ±{poll.marginOfError}%
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`${AHD.panel} rounded p-3`}>
          <div className={`${AHD.mono} text-[10px] uppercase ${AHD.muted}`}>Approve</div>
          <div className={`${AHD.mono} text-2xl font-semibold ${AHD.approve}`}>
            {poll.options.approve.toFixed(1)}%
          </div>
        </div>
        <div className={`${AHD.panel} rounded p-3`}>
          <div className={`${AHD.mono} text-[10px] uppercase ${AHD.muted}`}>Disapprove</div>
          <div className={`${AHD.mono} text-2xl font-semibold ${AHD.disapprove}`}>
            {poll.options.disapprove.toFixed(1)}%
          </div>
        </div>
        <div className={`${AHD.panel} rounded p-3`}>
          <div className={`${AHD.mono} text-[10px] uppercase ${AHD.muted}`}>Undecided</div>
          <div className={`${AHD.mono} text-2xl font-semibold ${AHD.undecided}`}>
            {poll.options.undecided.toFixed(1)}%
          </div>
        </div>
        <div className={`${AHD.panel} rounded p-3`}>
          <div className={`${AHD.mono} text-[10px] uppercase ${AHD.muted}`}>Spread</div>
          <div className={`${AHD.mono} text-2xl font-semibold ${AHD.accent}`}>
            {(poll.options.approve - poll.options.disapprove >= 0 ? "+" : "")}
            {(poll.options.approve - poll.options.disapprove).toFixed(1)}
          </div>
        </div>
      </div>

      {stats && (
        <div className={`${AHD.panel} rounded p-3`}>
          <div className={`${AHD.mono} text-[10px] uppercase ${AHD.muted} mb-2`}>
            Historical range ({stats.count} week{stats.count === 1 ? "" : "s"})
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={`${AHD.mono} text-xs ${AHD.muted}`}>Min</div>
              <div className={`${AHD.mono} text-sm ${AHD.disapprove}`}>{stats.min.toFixed(1)}%</div>
            </div>
            <div>
              <div className={`${AHD.mono} text-xs ${AHD.muted}`}>Avg</div>
              <div className={`${AHD.mono} text-sm ${AHD.accent}`}>{stats.avg.toFixed(1)}%</div>
            </div>
            <div>
              <div className={`${AHD.mono} text-xs ${AHD.muted}`}>Max</div>
              <div className={`${AHD.mono} text-sm ${AHD.approve}`}>{stats.max.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      <div className={`${AHD.panel} rounded p-3`}>
        <div className={`${AHD.mono} text-[10px] uppercase ${AHD.muted} mb-2`}>
          Trend
        </div>
        <Sparkline
          values={topicHistory.map((h) => h.options.approve)}
          color={meta.color}
        />
      </div>

      <div className="max-h-48 overflow-auto rounded border border-zinc-800">
        <table className={`${AHD.mono} w-full text-xs`}>
          <thead className="sticky top-0 bg-zinc-900 text-[10px] uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Week</th>
              <th className="px-3 py-2 text-right">Approve</th>
              <th className="px-3 py-2 text-right">Disapprove</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {[...topicHistory].reverse().map((h, i, arr) => {
              const prev = arr[i + 1];
              const d = prev ? h.options.approve - prev.options.approve : null;
              return (
                <tr key={h.id} className="border-t border-zinc-900">
                  <td className="px-3 py-1.5 text-zinc-400">w{h.week}</td>
                  <td className={`px-3 py-1.5 text-right ${AHD.approve}`}>
                    {h.options.approve.toFixed(1)}%
                  </td>
                  <td className={`px-3 py-1.5 text-right ${AHD.disapprove}`}>
                    {h.options.disapprove.toFixed(1)}%
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-400">
                    {d !== null ? formatDelta(d) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PollsPage() {
  const [country, setCountry] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [detail, setDetail] = useState<{ poll: Poll; history: Poll[] } | null>(null);

  const { data: pollsRes } = useApi<{ polls: Poll[] }>({
    url: "/api/polls?limit=200",
    pollIntervalMs: 12000,
  });
  const polls = pollsRes?.polls ?? [];

  const countries = useMemo(() => {
    const set = new Set(polls.map((p) => p.countryId));
    return ["all", ...Array.from(set).sort()];
  }, [polls]);

  const filtered = useMemo(() => {
    return polls
      .filter((p) => (country === "all" ? true : p.countryId === country))
      .filter((p) => (topicFilter === "all" ? true : p.topic === topicFilter))
      .sort((a, b) => (b.week - a.week) || a.topic.localeCompare(b.topic));
  }, [polls, country, topicFilter]);

  const latest = useMemo(() => {
    const byKey = new Map<string, Poll>();
    for (const p of filtered) {
      const key = `${p.countryId}:${p.topic}`;
      if (!byKey.has(key) || byKey.get(key)!.week < p.week) byKey.set(key, p);
    }
    return Array.from(byKey.values()).sort((a, b) => a.topic.localeCompare(b.topic));
  }, [filtered]);

  // Esc to close detail
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  return (
    <AppShell>
      {/* Header — terminal-style */}
      <div className={`${AHD.surface} -mx-4 -mt-4 mb-4 border-b border-zinc-800 px-4 py-3`}>
        <div className="flex items-baseline gap-2">
          <BarChart3 className="h-4 w-4 text-amber-300" />
          <h1 className={`${AHD.mono} text-sm font-semibold uppercase tracking-wider text-amber-300`}>
            Polls
          </h1>
          <span className={`${AHD.mono} text-[10px] uppercase tracking-wider ${AHD.muted}`}>
            /public-opinion
          </span>
        </div>
        <p className={`${AHD.mono} mt-1 text-[10px] uppercase tracking-wider ${AHD.muted}`}>
          Weekly sample · n=1,000 ±3% · 12 topics
        </p>
      </div>

      {/* Country filter chips — AHD-style category tags */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {countries.map((c) => {
          const isActive = country === c;
          const flag = c === "all" ? "🌍" : countryFlag(c);
          const label = c === "all" ? "All" : c.toUpperCase();
          return (
            <button
              key={c}
              onClick={() => setCountry(c)}
              className={`${AHD.mono} rounded border px-2.5 py-1 text-[11px] transition-colors ${
                isActive
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {flag} {label}
            </button>
          );
        })}
      </div>

      {/* Topic filter — line tabs */}
      <Tabs
        value={topicFilter}
        onValueChange={setTopicFilter}
        className="mb-3"
      >
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="all" className="text-xs">
            📋 All
          </TabsTrigger>
          {Object.entries(TOPIC_META).map(([slug, m]) => (
            <TabsTrigger key={slug} value={slug} className="text-xs">
              {m.emoji} {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Latest / History tabs — the main view */}
      <Tabs defaultValue="latest" className="mt-2">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="latest" className="text-xs">
            📋 Latest
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            📜 History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="latest" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((p) => (
            <PollCard
              key={`${p.countryId}-${p.topic}-${p.week}`}
              poll={p}
              history={filtered}
              onOpenDetail={(poll, history) => setDetail({ poll, history })}
            />
          ))}
          {latest.length === 0 && (
            <div className={`${AHD.panel} col-span-full rounded p-6 text-center ${AHD.muted} ${AHD.mono} text-xs`}>
              📭 No polls yet for this filter.
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <HistoryTable polls={filtered} />
        </TabsContent>
      </Tabs>

      {detail && (
        <TopicDetail
          poll={detail.poll}
          history={detail.history}
          onClose={() => setDetail(null)}
        />
      )}
    </AppShell>
  );
}

function HistoryTable({ polls }: { polls: Poll[] }) {
  if (polls.length === 0) {
    return (
      <div className={`${AHD.panel} rounded p-6 text-center ${AHD.muted} ${AHD.mono} text-xs`}>
        📭 No history yet.
      </div>
    );
  }
  // Group by week
  const byWeek = new Map<number, Poll[]>();
  for (const p of polls) {
    if (!byWeek.has(p.week)) byWeek.set(p.week, []);
    byWeek.get(p.week)!.push(p);
  }
  const weeks = Array.from(byWeek.keys()).sort((a, b) => b - a);

  return (
    <div className={`${AHD.panel} rounded`}>
      <table className={`${AHD.mono} w-full text-xs`}>
        <thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">Week</th>
            <th className="px-3 py-2 text-left">Topic</th>
            <th className="px-3 py-2 text-left">Country</th>
            <th className="px-3 py-2 text-right">Approve</th>
            <th className="px-3 py-2 text-right">Disapprove</th>
            <th className="px-3 py-2 text-right">Spread</th>
            <th className="px-3 py-2 text-right">N</th>
            <th className="px-3 py-2 text-right">MOE</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => {
            const ws = byWeek.get(w)!;
            return (
              <tr key={w} className="border-t border-zinc-900">
                <td className={`px-3 py-1.5 ${AHD.accent}`} rowSpan={ws.length}>
                  w{w}
                </td>
                {ws.sort((a, b) => a.topic.localeCompare(b.topic)).map((h, i) => (
                  <tr key={h.id} className="border-t border-zinc-900/50">
                    {i > 0 && <td className="px-3 py-1.5"></td>}
                    <td className="px-3 py-1.5 text-zinc-200">
                      <span className="mr-1.5">{topicMeta(h.topic).emoji}</span>
                      {topicMeta(h.topic).label}
                    </td>
                    <td className="px-3 py-1.5 text-zinc-400">
                      {countryFlag(h.countryId)} {h.countryId}
                    </td>
                    <td className={`px-3 py-1.5 text-right ${AHD.approve}`}>
                      {h.options.approve.toFixed(1)}%
                    </td>
                    <td className={`px-3 py-1.5 text-right ${AHD.disapprove}`}>
                      {h.options.disapprove.toFixed(1)}%
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-300">
                      {(h.options.approve - h.options.disapprove).toFixed(1)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-500">
                      {h.sampleSize.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-500">±{h.marginOfError}</td>
                  </tr>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
