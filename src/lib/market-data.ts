// Deterministic mock chemical commodity market data.
// Pseudo-random walks seeded by symbol so prices/series are stable per session.

export interface Commodity {
  symbol: string;
  name: string;
  category: string;
  unit: string;
  basePrice: number;
  volatility: number; // 0..1
}

export const COMMODITIES: Commodity[] = [
  { symbol: "ETH", name: "Ethylene", category: "Olefins", unit: "USD/MT", basePrice: 1180, volatility: 0.42 },
  { symbol: "PRP", name: "Propylene", category: "Olefins", unit: "USD/MT", basePrice: 1040, volatility: 0.38 },
  { symbol: "BNZ", name: "Benzene", category: "Aromatics", unit: "USD/MT", basePrice: 980, volatility: 0.55 },
  { symbol: "TLN", name: "Toluene", category: "Aromatics", unit: "USD/MT", basePrice: 910, volatility: 0.31 },
  { symbol: "MEG", name: "Mono-Ethylene Glycol", category: "Glycols", unit: "USD/MT", basePrice: 720, volatility: 0.48 },
  { symbol: "STY", name: "Styrene Monomer", category: "Aromatics", unit: "USD/MT", basePrice: 1320, volatility: 0.62 },
  { symbol: "MET", name: "Methanol", category: "Alcohols", unit: "USD/MT", basePrice: 380, volatility: 0.27 },
  { symbol: "AMM", name: "Ammonia", category: "Inorganics", unit: "USD/MT", basePrice: 540, volatility: 0.71 },
  { symbol: "URE", name: "Urea", category: "Fertilizers", unit: "USD/MT", basePrice: 420, volatility: 0.44 },
  { symbol: "PVC", name: "Polyvinyl Chloride", category: "Polymers", unit: "USD/MT", basePrice: 1090, volatility: 0.36 },
  { symbol: "HDPE", name: "High-Density Polyethylene", category: "Polymers", unit: "USD/MT", basePrice: 1240, volatility: 0.33 },
  { symbol: "PP", name: "Polypropylene", category: "Polymers", unit: "USD/MT", basePrice: 1180, volatility: 0.34 },
  { symbol: "PTA", name: "Purified Terephthalic Acid", category: "Aromatics", unit: "USD/MT", basePrice: 870, volatility: 0.40 },
  { symbol: "CAU", name: "Caustic Soda", category: "Inorganics", unit: "USD/MT", basePrice: 460, volatility: 0.52 },
  { symbol: "SUL", name: "Sulfuric Acid", category: "Inorganics", unit: "USD/MT", basePrice: 180, volatility: 0.66 },
];

export const CORRELATIONS: Record<string, string[]> = {
  ETH: ["HDPE", "PVC", "STY"],
  PRP: ["PP", "PVC"],
  BNZ: ["STY", "TLN", "PTA"],
  TLN: ["BNZ", "PTA"],
  MEG: ["ETH", "PTA"],
  STY: ["BNZ", "ETH"],
  MET: ["AMM", "URE"],
  AMM: ["URE", "SUL"],
  URE: ["AMM", "MET"],
  PVC: ["ETH", "CAU"],
  HDPE: ["ETH", "PP"],
  PP: ["PRP", "HDPE"],
  PTA: ["BNZ", "TLN", "MEG"],
  CAU: ["PVC", "SUL"],
  SUL: ["AMM", "CAU"],
};

// Mulberry32 deterministic PRNG
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromSymbol(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PricePoint {
  t: number; // unix ms
  date: string;
  price: number;
}

export function generateSeries(symbol: string, days = 365): PricePoint[] {
  const c = COMMODITIES.find((x) => x.symbol === symbol);
  if (!c) return [];
  const rand = rng(seedFromSymbol(symbol));
  const out: PricePoint[] = [];
  let price = c.basePrice * (0.85 + rand() * 0.3);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const drift = (rand() - 0.5) * c.volatility * 0.06 * price;
    const meanRev = (c.basePrice - price) * 0.01;
    price = Math.max(price * 0.5, price + drift + meanRev);
    const d = new Date(today.getTime() - i * 86400000);
    out.push({
      t: d.getTime(),
      date: d.toISOString().slice(0, 10),
      price: Math.round(price * 100) / 100,
    });
  }
  return out;
}

export interface CommodityQuote extends Commodity {
  price: number;
  change: number; // last vs prior
  changePct: number;
  changeWk: number;
  changeMo: number;
  high52: number;
  low52: number;
  series: PricePoint[];
  volatilityScore: number; // 0..100 realised
  momentum: number; // -100..100
}

export function getQuote(symbol: string): CommodityQuote | null {
  const c = COMMODITIES.find((x) => x.symbol === symbol);
  if (!c) return null;
  const series = generateSeries(symbol, 365);
  const last = series[series.length - 1].price;
  const prev = series[series.length - 2].price;
  const wkAgo = series[series.length - 8].price;
  const moAgo = series[series.length - 31].price;
  const high52 = Math.max(...series.map((p) => p.price));
  const low52 = Math.min(...series.map((p) => p.price));

  // realised volatility (stdev of daily returns) * sqrt(252) * 100, clamped
  const rets: number[] = [];
  for (let i = 1; i < series.length; i++) {
    rets.push(Math.log(series[i].price / series[i - 1].price));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;

  // momentum: 30d % change normalised
  const momentum = Math.max(-100, Math.min(100, ((last - moAgo) / moAgo) * 250));

  return {
    ...c,
    price: last,
    change: last - prev,
    changePct: ((last - prev) / prev) * 100,
    changeWk: ((last - wkAgo) / wkAgo) * 100,
    changeMo: ((last - moAgo) / moAgo) * 100,
    high52,
    low52,
    series,
    volatilityScore: Math.min(100, vol),
    momentum,
  };
}

export function allQuotes(): CommodityQuote[] {
  return COMMODITIES.map((c) => getQuote(c.symbol)!).filter(Boolean);
}

export function fmt(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}