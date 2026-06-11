import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMODITIES, allQuotes, fmt } from "@/lib/market-data";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Margin Calculator — ChemPulse" },
      {
        name: "description",
        content: "Build a recipe of raw materials and see live margin health.",
      },
    ],
  }),
  component: CalculatorPage,
});

interface Ingredient {
  id: string;
  symbol: string;
  qty: number; // MT per output unit
}

const DEFAULT_INGREDIENTS: Ingredient[] = [
  { id: "1", symbol: "ETH", qty: 0.55 },
  { id: "2", symbol: "BNZ", qty: 0.42 },
];

function CalculatorPage() {
  const quotes = useMemo(() => allQuotes(), []);
  const priceOf = (s: string) => quotes.find((q) => q.symbol === s)?.price ?? 0;

  const [productName, setProductName] = useState("Custom Product A");
  const [sellPrice, setSellPrice] = useState(1450);
  const [overhead, setOverhead] = useState(80);
  const [yieldPct, setYieldPct] = useState(94);
  const [ingredients, setIngredients] = useState<Ingredient[]>(DEFAULT_INGREDIENTS);

  const rawCost = ingredients.reduce((sum, ing) => sum + priceOf(ing.symbol) * ing.qty, 0);
  const effectiveCost = (rawCost + overhead) / (yieldPct / 100);
  const margin = sellPrice - effectiveCost;
  const marginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;

  const addIngredient = () => {
    const used = new Set(ingredients.map((i) => i.symbol));
    const next = COMMODITIES.find((c) => !used.has(c.symbol));
    if (!next) return;
    setIngredients([
      ...ingredients,
      { id: crypto.randomUUID(), symbol: next.symbol, qty: 0.1 },
    ]);
  };

  return (
    <AppShell>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Margin Calculator
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Recipe Builder</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recipe */}
        <section className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Product Name
              </Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Sell Price (USD/MT)
              </Label>
              <Input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(Number(e.target.value) || 0)}
                className="mt-1 font-mono tabular"
              />
            </div>
          </div>

          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Raw Materials
          </h2>
          <div className="space-y-2">
            {ingredients.map((ing) => {
              const q = quotes.find((x) => x.symbol === ing.symbol);
              const cost = (q?.price ?? 0) * ing.qty;
              return (
                <div
                  key={ing.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md border border-border bg-background p-2"
                >
                  <Select
                    value={ing.symbol}
                    onValueChange={(v) =>
                      setIngredients((arr) =>
                        arr.map((i) => (i.id === ing.id ? { ...i, symbol: v } : i)),
                      )
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMODITIES.map((c) => (
                        <SelectItem key={c.symbol} value={c.symbol}>
                          <span className="font-mono">{c.symbol}</span> — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={ing.qty}
                    onChange={(e) =>
                      setIngredients((arr) =>
                        arr.map((i) =>
                          i.id === ing.id ? { ...i, qty: Number(e.target.value) || 0 } : i,
                        ),
                      )
                    }
                    className="w-24 font-mono tabular"
                  />
                  <div className="w-28 text-right font-mono text-sm tabular">
                    ${fmt(cost)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setIngredients((arr) => arr.filter((i) => i.id !== ing.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button onClick={addIngredient} variant="outline" size="sm" className="mt-3">
            <Plus className="h-4 w-4" /> Add Material
          </Button>

          <div className="mt-6 space-y-4 border-t border-border pt-4">
            <SliderRow
              label="Yield"
              value={yieldPct}
              onChange={setYieldPct}
              min={50}
              max={100}
              step={1}
              display={`${yieldPct}%`}
            />
            <SliderRow
              label="Overhead per MT"
              value={overhead}
              onChange={setOverhead}
              min={0}
              max={400}
              step={5}
              display={`$${overhead}`}
            />
            <SliderRow
              label="Sell Price"
              value={sellPrice}
              onChange={setSellPrice}
              min={Math.round(effectiveCost * 0.5)}
              max={Math.round(effectiveCost * 2.5)}
              step={5}
              display={`$${sellPrice}`}
            />
          </div>
        </section>

        {/* Health */}
        <section className="space-y-4">
          <MarginHealth marginPct={marginPct} />
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {productName}
            </h2>
            <CostRow label="Raw Materials" value={rawCost} />
            <CostRow label="Overhead" value={overhead} />
            <CostRow
              label={`Yield Adj. (${yieldPct}%)`}
              value={effectiveCost - rawCost - overhead}
              dim
            />
            <div className="my-2 border-t border-border" />
            <CostRow label="Total Cost" value={effectiveCost} bold />
            <CostRow label="Sell Price" value={sellPrice} bold />
            <div className="my-2 border-t border-border" />
            <CostRow
              label="Margin / MT"
              value={margin}
              bold
              tone={margin >= 0 ? "up" : "down"}
            />
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Margin %</span>
              <span
                className={`font-mono text-2xl tabular ${
                  marginPct >= 0 ? "text-up" : "text-down"
                }`}
              >
                {marginPct >= 0 ? "+" : ""}
                {fmt(marginPct)}%
              </span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </Label>
        <span className="font-mono text-sm tabular text-primary">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function CostRow({
  label,
  value,
  bold,
  dim,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  dim?: boolean;
  tone?: "up" | "down";
}) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className={`text-sm ${dim ? "text-muted-foreground" : ""}`}>{label}</span>
      <span
        className={`font-mono tabular ${bold ? "text-base font-semibold" : "text-sm"} ${color}`}
      >
        ${fmt(value)}
      </span>
    </div>
  );
}

function MarginHealth({ marginPct }: { marginPct: number }) {
  const clamped = Math.max(-25, Math.min(50, marginPct));
  const normalized = ((clamped + 25) / 75) * 100; // map -25..50 -> 0..100
  const status =
    marginPct >= 25
      ? { label: "Healthy", color: "var(--color-up)" }
      : marginPct >= 10
        ? { label: "Acceptable", color: "var(--color-primary)" }
        : marginPct >= 0
          ? { label: "Thin", color: "var(--color-primary)" }
          : { label: "Loss", color: "var(--color-down)" };

  const angle = (normalized / 100) * 180;
  const r = 80;
  const cx = 100;
  const cy = 100;
  const x = cx + r * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const y = cy - r * Math.sin(Math.PI - (angle * Math.PI) / 180);

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Margin Health
      </h2>
      <svg viewBox="0 0 200 120" className="w-full">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke="var(--color-muted)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`}
          stroke={status.color}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          className="font-mono"
          fontSize="22"
          fill={status.color}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {fmt(marginPct)}%
        </text>
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-muted-foreground)"
        >
          {status.label}
        </text>
      </svg>
    </div>
  );
}