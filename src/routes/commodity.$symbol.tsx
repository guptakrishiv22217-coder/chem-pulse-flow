import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PriceChart } from "@/components/PriceChart";
import { Button } from "@/components/ui/button";
import { CORRELATIONS, fmt, getQuote } from "@/lib/market-data";
import { useWatchlist } from "@/lib/watchlist";

export const Route = createFileRoute("/commodity/$symbol")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol} — ChemPulse` },
      {
        name: "description",
        content: `Live price, 52-week range, momentum and volatility for ${params.symbol}.`,
      },
    ],
  }),
  loader: ({ params }) => {
    const q = getQuote(params.symbol.toUpperCase());
    if (!q) throw notFound();
    return null;
  },
  component: CommodityPage,
});

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
] as const;

function CommodityPage() {
  const { symbol } = Route.useParams();
  const sym = symbol.toUpperCase();
  const quote = useMemo(() => getQuote(sym)!, [sym]);
  const { has, toggle } = useWatchlist();
  const watched = has(sym);
  const [range, setRange] = useState<(typeof RANGES)[number]["label"]>("6M");
  const days = RANGES.find((r) => r.label === range)!.days;
  const slice = quote.series.slice(-days);

  const rangePct = ((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100;
  const correlated = (CORRELATIONS[sym] ?? []).map((s) => getQuote(s)!).filter(Boolean);

  return (
    <AppShell>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="flex items-center gap-1 hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
      </div>

      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {quote.category} · {quote.unit}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">
            {quote.name}{" "}
            <span className="font-mono text-base text-muted-foreground">{sym}</span>
          </h1>
        </div>
        <Button
          variant={watched ? "default" : "outline"}
          size="sm"
          onClick={() => toggle(sym)}
          className="shrink-0"
        >
          <Star className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
          {watched ? "Watching" : "Watch"}
        </Button>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Last
          </div>
          <div className="mt-1 font-mono text-2xl tabular">{fmt(quote.price)}</div>
          <div
            className={`font-mono text-xs tabular ${
              quote.changePct >= 0 ? "text-up" : "text-down"
            }`}
          >
            {quote.changePct >= 0 ? "▲" : "▼"} {fmt(Math.abs(quote.change))} ({fmt(
              Math.abs(quote.changePct),
            )}
            %)
          </div>
        </div>
        <KeyStat label="52W High" value={fmt(quote.high52)} />
        <KeyStat label="52W Low" value={fmt(quote.low52)} />
        <KeyStat
          label="1M Change"
          value={`${quote.changeMo >= 0 ? "+" : ""}${fmt(quote.changeMo)}%`}
          tone={quote.changeMo >= 0 ? "up" : "down"}
        />
      </div>

      <section className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest">Price History</h2>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r.label)}
                className={`rounded px-2.5 py-1 font-mono text-xs ${
                  range === r.label
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <PriceChart data={slice} height={360} />
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Gauge
          label="52-Week Range"
          value={rangePct}
          display={`${fmt(rangePct, 0)}%`}
          subtitle={`${fmt(quote.low52)} ↔ ${fmt(quote.high52)}`}
        />
        <Gauge
          label="Momentum (30D)"
          value={(quote.momentum + 100) / 2}
          display={`${quote.momentum >= 0 ? "+" : ""}${fmt(quote.momentum, 0)}`}
          subtitle={
            quote.momentum > 25
              ? "Strong upside"
              : quote.momentum < -25
                ? "Strong downside"
                : "Neutral"
          }
          tone={quote.momentum >= 0 ? "up" : "down"}
        />
        <Gauge
          label="Volatility Score"
          value={quote.volatilityScore}
          display={`σ ${fmt(quote.volatilityScore, 1)}`}
          subtitle={
            quote.volatilityScore > 55
              ? "Elevated"
              : quote.volatilityScore > 30
                ? "Moderate"
                : "Calm"
          }
          tone="warn"
        />
      </div>

      {correlated.length > 0 && (
        <section className="mt-6 rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest">
            Correlated Commodities
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {correlated.map((c) => (
              <Link
                key={c.symbol}
                to="/commodity/$symbol"
                params={{ symbol: c.symbol }}
                className="group rounded-md border border-border bg-background p-3 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-semibold text-primary">
                      {c.symbol}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm tabular">{fmt(c.price)}</div>
                    <div
                      className={`font-mono text-xs tabular ${
                        c.changePct >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {c.changePct >= 0 ? "+" : ""}
                      {fmt(c.changePct)}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-12">
                  <PriceChart
                    data={c.series.slice(-60)}
                    height={48}
                    compact
                    color={c.changePct >= 0 ? "var(--color-up)" : "var(--color-down)"}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function KeyStat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl tabular ${color}`}>{value}</div>
    </div>
  );
}

function Gauge({
  label,
  value,
  display,
  subtitle,
  tone,
}: {
  label: string;
  value: number; // 0..100
  display: string;
  subtitle: string;
  tone?: "up" | "down" | "warn";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  // Semi-circular gauge
  const angle = (clamped / 100) * 180;
  const r = 70;
  const cx = 90;
  const cy = 90;
  const x = cx + r * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const y = cy - r * Math.sin(Math.PI - (angle * Math.PI) / 180);
  const color =
    tone === "up"
      ? "var(--color-up)"
      : tone === "down"
        ? "var(--color-down)"
        : tone === "warn"
          ? clamped > 55
            ? "var(--color-down)"
            : clamped > 30
              ? "var(--color-primary)"
              : "var(--color-up)"
          : "var(--color-primary)";

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 180 110" className="w-full max-w-[220px]">
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            stroke="var(--color-muted)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={x} cy={y} r="5" fill={color} />
        </svg>
      </div>
      <div className="text-center">
        <div className="font-mono text-xl tabular" style={{ color }}>
          {display}
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}