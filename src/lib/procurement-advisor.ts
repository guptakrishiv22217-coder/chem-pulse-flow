import type { CommodityQuote, PricePoint } from "./market-data";

export interface ProcurementSignal {
  symbol: string;
  name: string;
  currentPrice: number;
  percentileRank: number; // 0-100, where current price sits in 90-day range
  signal: "strong-buy" | "buy" | "neutral" | "wait" | "strong-wait";
  reasoning: string;
  historicalReversionDays: number | null; // avg days for price to revert toward median after similar extremes
  daysAtExtreme: number; // how many consecutive days at this extreme
}

function percentileRank(series: number[], value: number): number {
  const sorted = [...series].sort((a, b) => a - b);
  const below = sorted.filter((v) => v <= value).length;
  return (below / sorted.length) * 100;
}

function findReversionPattern(series: PricePoint[], isHigh: boolean): number | null {
  // Find past instances where price hit a similar extreme (top/bottom 15% of 
  // trailing 90-day window at that point in time), then measure how many days 
  // later price moved back to within 5% of the 90-day median.
  const reversionDays: number[] = [];
  
  for (let i = 90; i < series.length - 1; i++) {
    const window = series.slice(i - 90, i).map((p) => p.price);
    const median = [...window].sort((a, b) => a - b)[Math.floor(window.length / 2)];
    const rank = percentileRank(window, series[i].price);
    
    const wasExtreme = isHigh ? rank > 85 : rank < 15;
    if (!wasExtreme) continue;

    // Look forward up to 30 days for reversion to within 5% of that median
    for (let j = i + 1; j < Math.min(i + 30, series.length); j++) {
      if (Math.abs(series[j].price - median) / median < 0.05) {
        reversionDays.push(j - i);
        break;
      }
    }
  }

  if (reversionDays.length === 0) return null;
  return Math.round(reversionDays.reduce((a, b) => a + b, 0) / reversionDays.length);
}

export function getProcurementSignal(quote: CommodityQuote): ProcurementSignal {
  const window90 = quote.series.slice(-90).map((p) => p.price);
  const rank = percentileRank(window90, quote.price);
  
  // Count consecutive days at this extreme
  let daysAtExtreme = 0;
  const isCurrentlyHigh = rank > 70;
  const isCurrentlyLow = rank < 30;

  for (let i = quote.series.length - 1; i >= 0; i--) {
    const w = quote.series.slice(Math.max(0, i - 90), i).map((p) => p.price);
    if (w.length < 30) break;
    const r = percentileRank(w, quote.series[i].price);
    const matches = isCurrentlyHigh ? r > 70 : isCurrentlyLow ? r < 30 : false;
    if (!matches) break;
    daysAtExtreme++;
  }

  const reversionDays = isCurrentlyHigh
    ? findReversionPattern(quote.series, true)
    : isCurrentlyLow
    ? findReversionPattern(quote.series, false)
    : null;

  let signal: ProcurementSignal["signal"];
  let reasoning: string;

  if (rank < 15) {
    signal = "strong-buy";
    reasoning = `${quote.name} is at the ${rank.toFixed(0)}th percentile of its 90-day range — ` +
      `among the cheapest it's been recently.` +
      (reversionDays ? ` Historically, prices this low have reverted upward within ~${reversionDays} days.` : "");
  } else if (rank < 35) {
    signal = "buy";
    reasoning = `${quote.name} is trading below its 90-day median (${rank.toFixed(0)}th percentile) — a reasonable entry point.`;
  } else if (rank > 85) {
    signal = "strong-wait";
    reasoning = `${quote.name} is at the ${rank.toFixed(0)}th percentile of its 90-day range — near a local high.` +
      (reversionDays ? ` In similar past instances, prices reverted toward median within ~${reversionDays} days.` : " Consider deferring non-urgent purchases.");
  } else if (rank > 65) {
    signal = "wait";
    reasoning = `${quote.name} is trading above its 90-day median (${rank.toFixed(0)}th percentile) — not the cheapest window.`;
  } else {
    signal = "neutral";
    reasoning = `${quote.name} is near its 90-day median — no strong timing signal either way.`;
  }

  return {
    symbol: quote.symbol,
    name: quote.name,
    currentPrice: quote.price,
    percentileRank: rank,
    signal,
    reasoning,
    historicalReversionDays: reversionDays,
    daysAtExtreme,
  };
}

export function getAllProcurementSignals(quotes: CommodityQuote[]): ProcurementSignal[] {
  return quotes.map(getProcurementSignal).sort((a, b) => a.percentileRank - b.percentileRank);
}
