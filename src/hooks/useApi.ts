import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/fetchClient";

interface FetcherOptions<T> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  pollIntervalMs?: number;
  onSuccess?: (data: T) => void;
}

export function useApi<T = unknown>(opts: FetcherOptions<T>) {
  const { url, method = "GET", body, pollIntervalMs, onSuccess } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const run = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    try {
      const res = await fetchApi(url, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json === "object" && json && "error" in json ? String((json as { error: string }).error) : `HTTP ${res.status}`);
      } else {
        setError(null);
        setData(json as T);
        onSuccess?.(json as T);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [url, method, body, onSuccess]);

  useEffect(() => {
    run();
    if (!pollIntervalMs) return;
    const id = setInterval(run, pollIntervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, pollIntervalMs]);

  return { data, loading, error, refresh: run };
}
