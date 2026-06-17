export interface PriceAlert {
  id: string;
  symbol: string;
  symbolName: string;
  direction: "above" | "below";
  threshold: number;
  createdAt: number;
}

const ALERTS_KEY = "chempulse:price-alerts:v1";

export function loadAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function checkTriggeredAlerts(
  alerts: PriceAlert[],
  prices: Record<string, number>,
): PriceAlert[] {
  return alerts.filter((a) => {
    const price = prices[a.symbol];
    if (price === undefined) return false;
    return a.direction === "above" ? price >= a.threshold : price <= a.threshold;
  });
}
