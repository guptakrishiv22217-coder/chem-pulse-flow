import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useCommodities, fmt, inr, type Commodity } from "@/lib/commodities";
import { useSimpleMode } from "@/lib/ui-mode";
import { generateBriefing } from "@/lib/briefing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChemPulse — Live Chemical Commodity Prices" },
      {
        name: "description",
        content:
          "Real-time chemical commodity prices in INR/kg, volatility alerts, and live market intelligence.",
      },
      { property: "og:title", content: "ChemPulse — Live Chemical Commodity Prices" },
      {
        property: "og:description",
        content: "A Bloomberg-style terminal for the Indian chemicals market.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: quotes = [], isLoading, error } = useCommodities();
  const simple = useSimpleMode();

  const sortedByChange = [...quotes].sort((a, b) => b.change_pct - a.change_pct);
  const gainers = sortedByChange.slice(0, 5);
  const losers = sortedByChange.slice(-5).reverse();
  const volAlerts = [...quotes]
    .filter((q) => q.volatility_score > 55 || Math.abs(q.change_pct) > 2)
    .sort((a, b) => b.volatility_score - a.volatility_score)
    .slice(0, 6);

  const totalSymbols = quotes.length;
  const avgChange =
    quotes.length > 0 ? quotes.reduce((a, b) => a + b.change_pct, 0) / quotes.length : 0;
  const advancers = quotes.filter((q) => q.change_pct > 0).length;
  const decliners = quotes.filter((q) => q.change_pct < 0).length;
  const briefing = useMemo(() => generateBriefing(quotes), [quotes]);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Market Overview
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Indian Chemicals Terminal</h1>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          Live prices · INR / kg · sourced from public commodities table
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-down/40 bg-down/10 p-3 font-mono text-xs text-down">
          Failed to load commodities: {(error as Error).message}
        </div>
      )}

      {!isLoading && briefing.length > 0 && (
        <section className="mb-6 rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
              Today's Briefing
            </h2>
          </div>
          <ul className="space-y-1.5">
            {briefing.map((line, i) => (
              <li key={i} className="font-sans text-sm text-foreground">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Tracked"
          value={isLoading ? "…" : String(totalSymbols)}
          hint={isLoading ? "loading" : "commodities"}
        />
        <Stat
          label="Avg Change"
          value={`${avgChange >= 0 ? "+" : ""}${fmt(avgChange)}%`}
          tone={avgChange >= 0 ? "up" : "down"}
        />
        <Stat label="Advancers" value={String(advancers)} tone="up" />
        <Stat label="Decliners" value={String(decliners)} tone="down" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Volatility Alerts</h2>
          </header>
          {volAlerts.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No alerts right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {volAlerts.map((q) => (
                <MoverRow key={q.symbol} q={q} showVol />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-up" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Top Gainers</h2>
          </header>
          <ul className="divide-y divide-border">
            {gainers.map((q) => (
              <MoverRow key={q.symbol} q={q} />
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <header className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-down" />
            <h2 className="font-mono text-xs uppercase tracking-widest">Top Decliners</h2>
          </header>
          <ul className="divide-y divide-border">
            {losers.map((q) => (
              <MoverRow key={q.symbol} q={q} />
            ))}
          </ul>
        </section>
      </div>

      {!simple && (
      <section className="mt-6 rounded-md border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-mono text-xs uppercase tracking-widest">All Commodities</h2>
          <span className="font-mono text-[10px] text-muted-foreground">
            {isLoading ? "loading…" : `${totalSymbols} symbols`}
          </span>
        </header>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 font-mono text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Fetching live prices…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Symbol</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-right">Last (₹/kg)</th>
                  <th className="px-4 py-2 text-right">1D</th>
                  <th className="px-4 py-2 text-right">1W</th>
                  <th className="px-4 py-2 text-right">1M</th>
                  <th className="hidden px-4 py-2 text-right md:table-cell">52W Range</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.symbol} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-2.5 font-mono font-semibold text-primary">
                      {q.symbol}
                    </td>
                    <td className="px-4 py-2.5">{q.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{q.category}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular">{inr(q.price)}</td>
                    <ChangeCell value={q.change_pct} />
                    <ChangeCell value={q.change_wk} />
                    <ChangeCell value={q.change_mo} />
                    <td className="hidden px-4 py-2.5 md:table-cell">
                      <RangeBar low={q.low_52} high={q.high_52} value={q.price} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
    </AppShell>
  );
}

function MoverRow({ q, showVol }: { q: Commodity; showVol?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="font-mono text-sm">{q.symbol}</div>
        <div className="truncate text-xs text-muted-foreground">{q.name}</div>
      </div>
      <div className="text-right">
        {showVol ? (
          <div className="font-mono text-xs tabular text-primary">
            σ {fmt(q.volatility_score, 1)}
          </div>
        ) : (
          <div className="font-mono text-xs tabular text-muted-foreground">{inr(q.price)}</div>
        )}
        <div
          className={`font-mono text-xs tabular ${
            q.change_pct >= 0 ? "text-up" : "text-down"
          }`}
        >
          {q.change_pct >= 0 ? "+" : ""}
          {fmt(q.change_pct)}%
        </div>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  hint?: string;
}) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl tabular ${color}`}>{value}</div>
      {hint && (
        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function ChangeCell({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <td className={`px-4 py-2.5 text-right font-mono tabular ${up ? "text-up" : "text-down"}`}>
      {up ? "+" : ""}
      {fmt(value)}%
    </td>
  );
}

function RangeBar({ low, high, value }: { low: number; high: number; value: number }) {
  const range = Math.max(high - low, 0.0001);
  const pct = Math.max(0, Math.min(100, ((value - low) / range) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tabular text-muted-foreground">{fmt(low, 0)}</span>
      <div className="relative h-1.5 w-28 rounded-full bg-muted">
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-primary"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] tabular text-muted-foreground">{fmt(high, 0)}</span>
    </div>
  );
}
