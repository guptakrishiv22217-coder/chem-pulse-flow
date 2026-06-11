import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PriceChart } from "@/components/PriceChart";
import { allQuotes, fmt } from "@/lib/market-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChemPulse — Chemical Commodity Intelligence" },
      {
        name: "description",
        content:
          "Real-time chemical commodity prices, volatility alerts, margin analysis and watchlists.",
      },
      { property: "og:title", content: "ChemPulse — Chemical Commodity Intelligence" },
      {
        property: "og:description",
        content: "A Bloomberg-style terminal for the global chemicals market.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const quotes = useMemo(() => allQuotes(), []);
  const sortedByChange = [...quotes].sort((a, b) => b.changePct - a.changePct);
  const gainers = sortedByChange.slice(0, 5);
  const losers = sortedByChange.slice(-5).reverse();
  const volAlerts = [...quotes]
    .filter((q) => q.volatilityScore > 55 || Math.abs(q.changePct) > 2)
    .sort((a, b) => b.volatilityScore - a.volatilityScore)
    .slice(0, 6);

  const featured = quotes.find((q) => q.symbol === "ETH")!;
  const totalSymbols = quotes.length;
  const avgChange = quotes.reduce((a, b) => a + b.changePct, 0) / quotes.length;
  const advancers = quotes.filter((q) => q.changePct > 0).length;
  const decliners = quotes.filter((q) => q.changePct < 0).length;

  return (
    <AppShell>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Market Overview
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Global Chemicals Terminal</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tracked" value={String(totalSymbols)} />
        <Stat
          label="Avg Change"
          value={`${avgChange >= 0 ? "+" : ""}${fmt(avgChange)}%`}
          tone={avgChange >= 0 ? "up" : "down"}
        />
        <Stat label="Advancers" value={String(advancers)} tone="up" />
        <Stat label="Decliners" value={String(decliners)} tone="down" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Featured chart */}
        <section className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <header className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Featured · {featured.category}
              </p>
              <Link
                to="/commodity/$symbol"
                params={{ symbol: featured.symbol }}
                className="text-lg font-semibold hover:text-primary"
              >
                {featured.name}{" "}
                <span className="font-mono text-sm text-muted-foreground">
                  {featured.symbol}
                </span>
              </Link>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl tabular">{fmt(featured.price)}</div>
              <div
                className={`font-mono text-xs tabular ${
                  featured.changePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {featured.changePct >= 0 ? "▲" : "▼"} {fmt(Math.abs(featured.change))} ({fmt(
                  Math.abs(featured.changePct),
                )}
                %)
              </div>
            </div>
          </header>
          <PriceChart data={featured.series.slice(-180)} height={300} />
        </section>

        {/* Volatility alerts */}
        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Volatility Alerts</h2>
          </header>
          <ul className="divide-y divide-border">
            {volAlerts.map((q) => (
              <li key={q.symbol}>
                <Link
                  to="/commodity/$symbol"
                  params={{ symbol: q.symbol }}
                  className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm">{q.symbol}</div>
                    <div className="truncate text-xs text-muted-foreground">{q.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs tabular text-primary">
                      σ {fmt(q.volatilityScore, 1)}
                    </div>
                    <div
                      className={`font-mono text-xs tabular ${
                        q.changePct >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {q.changePct >= 0 ? "+" : ""}
                      {fmt(q.changePct)}%
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Top movers */}
        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-up" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Top Gainers</h2>
          </header>
          <MoverList items={gainers} />
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-down" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Top Decliners</h2>
          </header>
          <MoverList items={losers} />
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Most Active</h2>
          </header>
          <MoverList
            items={[...quotes]
              .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
              .slice(0, 5)}
          />
        </section>
      </div>

      {/* Market table */}
      <section className="mt-6 rounded-md border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-mono text-xs uppercase tracking-widest">All Commodities</h2>
          <span className="font-mono text-[10px] text-muted-foreground">{totalSymbols} symbols</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Last</th>
                <th className="px-4 py-2 text-right">1D</th>
                <th className="px-4 py-2 text-right">1W</th>
                <th className="px-4 py-2 text-right">1M</th>
                <th className="hidden px-4 py-2 text-right md:table-cell">52W Range</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.symbol} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-2.5">
                    <Link
                      to="/commodity/$symbol"
                      params={{ symbol: q.symbol }}
                      className="font-mono font-semibold text-primary"
                    >
                      {q.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{q.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{q.category}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular">{fmt(q.price)}</td>
                  <ChangeCell value={q.changePct} />
                  <ChangeCell value={q.changeWk} />
                  <ChangeCell value={q.changeMo} />
                  <td className="hidden px-4 py-2.5 md:table-cell">
                    <RangeBar low={q.low52} high={q.high52} value={q.price} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl tabular ${color}`}>{value}</div>
    </div>
  );
}

function MoverList({ items }: { items: ReturnType<typeof allQuotes> }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((q) => (
        <li key={q.symbol}>
          <Link
            to="/commodity/$symbol"
            params={{ symbol: q.symbol }}
            className="flex items-center justify-between gap-3 py-2 hover:text-primary"
          >
            <div className="min-w-0">
              <div className="font-mono text-sm">{q.symbol}</div>
              <div className="truncate text-xs text-muted-foreground">{q.name}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm tabular">{fmt(q.price)}</div>
              <div
                className={`font-mono text-xs tabular ${
                  q.changePct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {q.changePct >= 0 ? "+" : ""}
                {fmt(q.changePct)}%
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ChangeCell({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <td
      className={`px-4 py-2.5 text-right font-mono tabular ${up ? "text-up" : "text-down"}`}
    >
      {up ? "+" : ""}
      {fmt(value)}%
    </td>
  );
}

function RangeBar({ low, high, value }: { low: number; high: number; value: number }) {
  const pct = ((value - low) / (high - low)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tabular text-muted-foreground">{fmt(low, 0)}</span>
      <div className="relative h-1.5 w-32 rounded-full bg-muted">
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-primary"
          style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="font-mono text-[10px] tabular text-muted-foreground">{fmt(high, 0)}</span>
    </div>
  );
}
