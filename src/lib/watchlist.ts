import { useEffect, useState, useCallback } from "react";

const KEY = "chempulse:watchlist";
const DEFAULT = ["ETH", "BNZ", "AMM", "STY", "HDPE"];

function read(): string[] {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function useWatchlist() {
  const [list, setList] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setList(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    setList(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(
    (symbol: string) => {
      const next = list.includes(symbol) ? list.filter((s) => s !== symbol) : [...list, symbol];
      persist(next);
    },
    [list, persist],
  );

  const has = useCallback((symbol: string) => list.includes(symbol), [list]);

  return { list, toggle, has };
}