import { useEffect, useState } from "react";

interface LiveEvent {
  id: string;
  week: number;
  kind: string;
  message: string;
  countryId: string | null;
  payload: Record<string, unknown>;
}

/** Subscribes to /api/world/stream and returns the latest events. */
export function useLiveEvents(max = 50): { events: LiveEvent[]; tick: number | null } {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [tick, setTick] = useState<number | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/world/stream", { withCredentials: true });
    es.addEventListener("event", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as LiveEvent;
        setEvents((prev) => [data, ...prev].slice(0, max));
      } catch {}
    });
    es.addEventListener("tick", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { week: number };
        setTick(data.week);
      } catch {}
    });
    es.onerror = () => {
      // EventSource auto-reconnects
    };
    return () => es.close();
  }, [max]);

  return { events, tick };
}