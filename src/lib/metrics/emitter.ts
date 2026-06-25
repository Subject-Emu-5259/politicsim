// Tiny pub/sub used to fan out game updates to connected SSE clients.
// We avoid a heavyweight dep like Redis here — this is single-process and small-scale.

type Listener = (data: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(channel: string, fn: Listener): () => void {
  let set = listeners.get(channel);
  if (!set) {
    set = new Set();
    listeners.set(channel, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(channel);
  };
}

export function emit(channel: string, data: unknown) {
  const set = listeners.get(channel);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(data);
    } catch (e) {
      console.error("[emitter] listener error", e);
    }
  }
}

export function recordTick(weeksElapsed: number) {
  emit("world", { kind: "tick", weeksElapsed, at: Date.now() });
}