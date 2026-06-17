import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Beaker, Loader2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useCommodities, fmt, inr } from "@/lib/commodities";
import { useSimpleMode } from "@/lib/ui-mode";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Margin Calculator — ChemPulse" },
      {
        name: "description",
        content:
          "Reactive Blue Dye margin calculator with live raw material prices and what-if price-spike sliders.",
      },
    ],
  }),
  component: CalculatorPage,
});

// Layer 3 — Reactive Blue Dye recipe (kg of raw material per kg of finished dye)
const RECIPE = [
  { symbol: "HACID", label: "H-Acid", qty: 0.35 },
  { symbol: "ANILINE", label: "Aniline", qty: 0.18 },
  { symbol: "CAUSTIC", label: "Caustic Soda (Flakes)", qty: 0.22 },
] as const;

const COST_DELTAS = [-0.20, -0.10, 0, +0.10, +0.20];
const PRICE_DELTAS = [-0.10, -0.05, 0, +0.05, +0.10];

interface Scenario {
  id: string;
  name: string;
  savedAt: number;
  marginPct: number;
  finishedPrice: number;
  snapshot: string;
}

const SCENARIOS_KEY = "chempulse:scenarios:v2";

function loadScenarios(): Scenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function SensitivityTable({
  baseCost,
  basePrice,
}: {
  baseCost: number;
  basePrice: number;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-3 py-2 text-left font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
              Cost ↓ / Price →
            </th>
            {PRICE_DELTAS.map((pd) => (
              <th
                key={pd}
                className="px-3 py-2 text-center font-sans text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                {pd >= 0 ? "+" : ""}
                {(pd * 100).toFixed(0)}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COST_DELTAS.map((cd) => (
            <tr
              key={cd}
              className="border-b border-border last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-2 font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
                {cd >= 0 ? "+" : ""}
                {(cd * 100).toFixed(0)}%
              </td>
              {PRICE_DELTAS.map((pd) => {
                const adjCost = baseCost * (1 + cd);
                const adjPrice = basePrice * (1 + pd);
                const m =
                  adjPrice > 0
                    ? ((adjPrice - adjCost) / adjPrice) * 100
                    : -999;
                const style =
                  m >= 25
                    ? "bg-up/15 text-up"
                    : m >= 10
                      ? "bg-primary/10 text-primary"
                      : m >= 0
                        ? "bg-muted/40 text-foreground"
                        : "bg-down/15 text-down";
                const isBase = cd === 0 && pd === 0;
                return (
                  <td
                    key={pd}
                    className={`px-3 py-2.5 text-center tabular font-semibold ${style} ${isBase ? "ring-1 ring-inset ring-primary/60" : ""}`}
                  >
                    {m > -999
                      ? `${m >= 0 ? "+" : ""}${m.toFixed(1)}%`
                      : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalculatorPage() {
  const { data: quotes = [], isLoading, error } = useCommodities();
  const simple = useSimpleMode();

  const [productName, setProductName] = useState("Reactive Blue Dye");
  const [sellPrice, setSellPrice] = useState(380); // ₹/kg finished
  const [targetMargin, setTargetMargin] = useState(25); // %
  // What-if % adjustment per raw material (-50% .. +100%)
  const [shocks, setShocks] = useState<Record<string, number>>({
    HACID: 0,
    ANILINE: 0,
    CAUSTIC: 0,
  });
  const [scenarios, setScenarios] = useState<Scenario[]>(() => loadScenarios());
  const [showScenarios, setShowScenarios] = useState(false);

  const lines = useMemo(
    () =>
      RECIPE.map((r) => {
        const q = quotes.find((x) => x.symbol === r.symbol);
        const basePrice = q?.price ?? 0;
        const shockPct = shocks[r.symbol] ?? 0;
        const shockedPrice = basePrice * (1 + shockPct / 100);
        const cost = shockedPrice * r.qty;
        return { ...r, basePrice, shockPct, shockedPrice, cost, found: !!q };
      }),
    [quotes, shocks],
  );

  const rawCost = lines.reduce((s, l) => s + l.cost, 0);
  const margin = sellPrice - rawCost;
  const marginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;
  const targetCost = sellPrice * (1 - targetMargin / 100);
  const headroom = targetCost - rawCost; // positive = healthy

  // Health gauge: marginPct vs targetMargin
  const health =
    marginPct >= targetMargin
      ? "Healthy"
      : marginPct >= targetMargin * 0.6
        ? "At Risk"
        : marginPct >= 0
          ? "Critical"
          : "Loss";
  const healthTone =
    health === "Healthy"
      ? "text-up"
      : health === "At Risk"
        ? "text-primary"
        : "text-down";
  const gaugePct = Math.max(0, Math.min(100, (marginPct / Math.max(targetMargin, 1)) * 100));

  return (
    <AppShell>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Layer 3 · Margin Calculator
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Beaker className="h-6 w-6 shrink-0 text-primary" />
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full max-w-xl border-b-2 border-transparent bg-transparent pb-1 font-sans text-2xl font-bold text-foreground outline-none transition-colors hover:border-border focus:border-primary sm:text-3xl"
          />
          <button
            onClick={() => {
              const sc: Scenario = {
                id: crypto.randomUUID(),
                name: `${new Date().toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`,
                savedAt: Date.now(),
                marginPct,
                finishedPrice: sellPrice,
                snapshot: JSON.stringify({
                  productName,
                  sellPrice,
                  targetMargin,
                  shocks,
                }),
              };
              const updated = [sc, ...scenarios].slice(0, 6);
              setScenarios(updated);
              localStorage.setItem(SCENARIOS_KEY, JSON.stringify(updated));
              setShowScenarios(true);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            Save Scenario
          </button>
        </div>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          Live raw material prices from commodities table · what-if sliders simulate price spikes
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-down/40 bg-down/10 p-3 font-mono text-xs text-down">
          Failed to load prices: {(error as Error).message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recipe + sliders */}
        <section className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground">
              Margin Levers
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Finished Price (₹/kg)
              </Label>
              <Input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(Number(e.target.value) || 0)}
                className="mt-1 font-mono tabular"
              />
              <div className="mt-1.5 flex flex-wrap justify-between gap-x-2 font-mono text-[10px] text-muted-foreground">
                <span>Break-even: ₹{rawCost.toFixed(2)}</span>
                <span className="text-primary">15%: ₹{(rawCost / 0.85).toFixed(2)}</span>
                <span className="text-up">25%: ₹{(rawCost / 0.75).toFixed(2)}</span>
              </div>
            </div>
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Target Margin (%)
              </Label>
              <Input
                type="number"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value) || 0)}
                className="mt-1 font-mono tabular"
              />
            </div>
          </div>

          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Recipe · Raw Materials (kg per kg of finished dye)
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 font-mono text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading live prices…
            </div>
          ) : (
            <div className="space-y-4">
              {lines.map((l) => (
                <div key={l.symbol} className="rounded-md border border-border bg-background p-3">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        {l.label}{" "}
                        <span className="text-muted-foreground">({l.symbol})</span>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {fmt(l.qty, 2)} kg/kg · live {inr(l.basePrice)}/kg
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular">
                        {inr(l.shockedPrice)}{" "}
                        <span className="text-muted-foreground">/kg</span>
                      </div>
                      <div className="font-mono text-[11px] tabular text-primary">
                        cost {inr(l.cost)}
                      </div>
                    </div>
                  </div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      What-if price shock
                    </Label>
                    <span
                      className={`font-mono text-xs tabular ${
                        l.shockPct > 0
                          ? "text-down"
                          : l.shockPct < 0
                            ? "text-up"
                            : "text-muted-foreground"
                      }`}
                    >
                      {l.shockPct > 0 ? "+" : ""}
                      {l.shockPct}%
                    </span>
                  </div>
                  <Slider
                    value={[l.shockPct]}
                    min={-50}
                    max={100}
                    step={1}
                    onValueChange={(v) =>
                      setShocks((s) => ({ ...s, [l.symbol]: v[0] }))
                    }
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>-50%</span>
                    <span>baseline</span>
                    <span>+100%</span>
                  </div>
                </div>
              ))}

              {lines.some((l) => !l.found) && (
                <p className="font-mono text-[11px] text-down">
                  Some recipe symbols are missing from the commodities table.
                </p>
              )}

              <button
                onClick={() => setShocks({ HACID: 0, ANILINE: 0, CAUSTIC: 0 })}
                className="font-mono text-[11px] text-muted-foreground underline hover:text-foreground"
              >
                Reset all shocks
              </button>
            </div>
          )}
        </section>

        {/* Health gauge */}
        <section className="space-y-4">
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Margin Health
            </h2>
            <div className="mb-2 flex items-baseline justify-between">
              <span className={`font-mono text-3xl font-semibold tabular ${healthTone}`}>
                {fmt(marginPct, 1)}%
              </span>
              <span className={`font-mono text-xs uppercase tracking-widest ${healthTone}`}>
                {health}
              </span>
            </div>
            <Gauge value={gaugePct} />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>target {targetMargin}%</span>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border pt-3 font-mono text-xs">
              <Row label="Raw cost / kg" value={inr(rawCost)} />
              <Row label="Sell price / kg" value={inr(sellPrice)} />
              <Row
                label="Margin / kg"
                value={inr(margin)}
                tone={margin >= 0 ? "up" : "down"}
                bold
              />
              <Row
                label={`Headroom vs ${targetMargin}% target`}
                value={`${headroom >= 0 ? "+" : ""}${inr(headroom)}`}
                tone={headroom >= 0 ? "up" : "down"}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Cost Breakdown
            </h2>
            {lines.map((l) => {
              const share = rawCost > 0 ? (l.cost / rawCost) * 100 : 0;
              return (
                <div key={l.symbol} className="mb-2.5">
                  <div className="flex items-baseline justify-between font-mono text-xs">
                    <span>{l.label}</span>
                    <span className="tabular">
                      {inr(l.cost)}{" "}
                      <span className="text-muted-foreground">({fmt(share, 0)}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showScenarios && (
        <section className="mt-6 rounded-md border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-xs uppercase tracking-widest text-muted-foreground">
              Saved Scenarios ({scenarios.length}/6)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowScenarios(false)}
                className="font-sans text-[10px] text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
              <button
                onClick={() => {
                  setScenarios([]);
                  localStorage.removeItem(SCENARIOS_KEY);
                }}
                className="font-sans text-[10px] text-muted-foreground hover:text-destructive"
              >
                Clear all
              </button>
            </div>
          </div>
          {scenarios.length === 0 ? (
            <p className="font-sans text-xs text-muted-foreground">
              No scenarios saved yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((sc) => {
                const delta = sc.marginPct - marginPct;
                return (
                  <div
                    key={sc.id}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-sans text-xs text-muted-foreground">
                        {sc.name}
                      </span>
                      <button
                        onClick={() => {
                          const updated = scenarios.filter((s) => s.id !== sc.id);
                          setScenarios(updated);
                          localStorage.setItem(SCENARIOS_KEY, JSON.stringify(updated));
                        }}
                        className="font-mono text-sm leading-none text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span
                        className={`font-mono text-xl tabular font-semibold ${sc.marginPct >= 0 ? "text-up" : "text-down"}`}
                      >
                        {sc.marginPct >= 0 ? "+" : ""}
                        {sc.marginPct.toFixed(1)}%
                      </span>
                      <span
                        className={`font-mono text-xs tabular ${delta >= 0 ? "text-up" : "text-down"}`}
                      >
                        vs now {delta >= 0 ? "+" : ""}
                        {delta.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 font-sans text-[10px] text-muted-foreground">
                      ₹{sc.finishedPrice}/kg · saved{" "}
                      {new Date(sc.savedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Recommended Actions
        </h2>
        {(() => {
          const spiked = lines.filter((l) => l.shockPct > 30);
          if (spiked.length === 0) {
            return (
              <div className="rounded-md border border-border bg-card p-4 font-mono text-xs text-muted-foreground">
                Cost levels are stable. No immediate action required.
              </div>
            );
          }
          return (
            <div className="space-y-3">
              {spiked.map((l) => {
                const suggestedPrice = rawCost / 0.75;
                return (
                  <Alert
                    key={l.symbol}
                    variant="default"
                    className="border-yellow-500/30 bg-yellow-500/5"
                  >
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertTitle>Alert: {l.label} Price Spike Simulated</AlertTitle>
                    <AlertDescription>
                      At +{l.shockPct}% cost shock, your margin drops to{" "}
                      {fmt(marginPct, 1)}%. Consider locking in forward contracts or
                      raising finished price to at least ₹{suggestedPrice.toFixed(2)}/kg.
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          );
        })()}
      </section>

      {simple ? (
        <section className="mt-8 rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 font-sans text-xs uppercase tracking-widest text-muted-foreground">
            What-if outlook
          </h2>
          {(() => {
            const projected = sellPrice > 0 ? ((sellPrice - rawCost * 1.1) / sellPrice) * 100 : 0;
            const belowTarget = projected < targetMargin;
            return (
              <p className="font-sans text-sm text-foreground">
                If your raw material costs rise by 10%, your margin would drop to approximately{" "}
                <span className={belowTarget ? "font-semibold text-down" : "font-semibold text-up"}>
                  {projected.toFixed(1)}%
                </span>
                .{belowTarget ? " This would put you below your target margin." : ""}
              </p>
            );
          })()}
        </section>
      ) : (
        <section className="mt-8">
          <h2 className="mb-1 font-sans text-xs uppercase tracking-widest text-muted-foreground">
            Margin Sensitivity
          </h2>
          <p className="mb-4 font-sans text-xs text-muted-foreground">
            Green = ≥25% margin · Amber = 10–25% · Red = loss. Current scenario is highlighted.
          </p>
          <SensitivityTable baseCost={rawCost} basePrice={sellPrice} />
        </section>
      )}
    </AppShell>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "up" | "down";
}) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular ${bold ? "font-semibold" : ""} ${color}`}>{value}</span>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 100 ? "bg-up" : v >= 60 ? "bg-primary" : v >= 1 ? "bg-down/70" : "bg-down";
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full transition-all ${tone}`}
        style={{ width: `${Math.min(v, 100)}%` }}
      />
      <div className="absolute inset-y-0 left-[100%] w-px bg-foreground/60" />
    </div>
  );
}
