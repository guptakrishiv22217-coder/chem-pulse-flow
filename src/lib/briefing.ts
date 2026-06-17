import type { Commodity } from "./commodities";

export function generateBriefing(quotes: Commodity[]): string[] {
  const lines: string[] = [];
  if (quotes.length === 0) return lines;

  const sorted = [...quotes].sort(
    (a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct),
  );
  const biggest = sorted[0];
  if (biggest && Math.abs(biggest.change_pct) > 0.5) {
    const dir = biggest.change_pct > 0 ? "risen" : "fallen";
    lines.push(
      `${biggest.name} has ${dir} ${Math.abs(biggest.change_pct).toFixed(1)}% today` +
        `${Math.abs(biggest.change_pct) > 2 ? " — the largest move on the board" : ""}.`,
    );
  }

  const highVol = quotes.filter((q) => q.volatility_score > 50);
  if (highVol.length > 0) {
    const names = highVol.slice(0, 2).map((q) => q.name).join(" and ");
    lines.push(
      `${names} ${highVol.length > 1 ? "are" : "is"} showing elevated volatility ` +
        `— consider locking in prices if you're sourcing soon.`,
    );
  }

  const advancers = quotes.filter((q) => q.change_pct > 0).length;
  const total = quotes.length;
  if (advancers > total * 0.7) {
    lines.push(
      `Most of the market (${advancers}/${total}) is trending up today — costs broadly rising.`,
    );
  } else if (advancers < total * 0.3) {
    lines.push(
      `Most of the market (${total - advancers}/${total}) is trending down today — a good window to negotiate purchases.`,
    );
  }

  const strongMomentum = quotes.filter((q) => Math.abs(q.change_mo) > 5);
  if (strongMomentum.length > 0) {
    const q = strongMomentum[0];
    lines.push(
      `${q.name} has strong ${q.change_mo > 0 ? "upward" : "downward"} momentum ` +
        `over the past month (${q.change_mo > 0 ? "+" : ""}${q.change_mo.toFixed(1)}%).`,
    );
  }

  if (lines.length === 0) {
    lines.push("Markets are calm today — no significant price movements to report.");
  }

  return lines.slice(0, 4);
}
