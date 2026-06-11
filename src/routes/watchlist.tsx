import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Star, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PriceChart } from "@/components/PriceChart";
import { Button } from "@/components/ui/button";
import { COMMODITIES, fmt, getQuote } from "@/lib/market-data";
import { useWatchlist } from "@/lib/watchlist";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — ChemPulse" },
      { name: "description", content: "Track the commodities that matter to your business." },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { list, has, toggle } = useWatchlist();
  const quotes = useMemo(
    () => list.map((s) => getQuote(s)).filter((q): q is NonNullable<typeof q> => Boolean(q)),
    [list],
  );
  const available = COMMODITIES.filter((c) => !has(c.symbol));

  return (
    <AppShell>
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            My Watchlist
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            {quotes.length} {quotes.length === 1 ? "Commodity" : "Commodities"} Tracked
          </h1>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
          <Star className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Your watchlist is empty. Add commodities below to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((q) => (
            <article
              key={q.symbol}
              className="group rounded-md border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <header className="mb-2 flex items-start justify-between gap-2">
                <Link
                  to="/commodity/$symbol"
                  params={{ symbol: q.symbol }}
                  className="min-w-0"
                >
                  <div className="font-mono text-sm font-semibold text-primary">{q.symbol}</div>
                  <div className="truncate text-sm">{q.name}</div>
                  <div className="text-xs text-muted-foreground">{q.category}</div>
                </Link>
                <button
                  onClick={() => toggle(q.symbol)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                  aria-label="Remove from watchlist"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-2xl tabular">{fmt(q.price)}</div>
                <div
                  className={`font-mono text-sm tabular ${
                    q.changePct >= 0 ? "text-up" : "text-down"
                  }`}
                >
                  {q.changePct >= 0 ? "▲" : "▼"} {fmt(Math.abs(q.changePct))}%
                </div>
              </div>
              <div className="mt-3 h-16">
                <PriceChart
                  data={q.series.slice(-90)}
                  height={64}
                  compact
                  color={q.changePct >= 0 ? "var(--color-up)" : "var(--color-down)"}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2 text-center">
                <MiniStat label="1W" value={q.changeWk} />
                <MiniStat label="1M" value={q.changeMo} />
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">σ</div>
                  <div className="font-mono text-xs tabular text-primary">
                    {fmt(q.volatilityScore, 1)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Add to Watchlist
          </h2>
          <div className="flex flex-wrap gap-2">
            {available.map((c) => (
              <Button
                key={c.symbol}
                variant="outline"
                size="sm"
                onClick={() => toggle(c.symbol)}
              >
                <Star className="h-3.5 w-3.5" />
                <span className="font-mono">{c.symbol}</span>
                <span className="text-muted-foreground">{c.name}</span>
              </Button>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div
        className={`font-mono text-xs tabular ${value >= 0 ? "text-up" : "text-down"}`}
      >
        {value >= 0 ? "+" : ""}
        {fmt(value)}%
      </div>
    </div>
  );
}