import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Bell, Calculator, LayoutDashboard, Star, X, Zap } from "lucide-react";
import { allQuotes, fmt } from "@/lib/market-data";
import { useEffect, useMemo, useState } from "react";
import { SimpleModeContext } from "@/lib/ui-mode";
import {
  loadAlerts,
  saveAlerts,
  checkTriggeredAlerts,
  type PriceAlert,
} from "@/lib/alerts";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/watchlist", label: "Watchlist", icon: Star, exact: true },
  { to: "/calculator", label: "Margin Calc", icon: Calculator, exact: true },
] as const;

function Ticker() {
  const quotes = useMemo(() => allQuotes(), []);
  // Duplicate for seamless loop
  const items = [...quotes, ...quotes];
  return (
    <div className="relative overflow-hidden border-y border-border bg-sidebar">
      <div className="flex animate-[ticker_90s_linear_infinite] whitespace-nowrap py-2 will-change-transform">
        {items.map((q, i) => {
          const up = q.changePct >= 0;
          return (
            <Link
              key={`${q.symbol}-${i}`}
              to="/commodity/$symbol"
              params={{ symbol: q.symbol }}
              className="mx-6 flex shrink-0 items-center gap-2 font-mono text-xs hover:text-primary"
            >
              <span className="text-muted-foreground">{q.symbol}</span>
              <span className="tabular">{fmt(q.price)}</span>
              <span className={up ? "text-up" : "text-down"}>
                {up ? "▲" : "▼"} {fmt(Math.abs(q.changePct))}%
              </span>
            </Link>
          );
        })}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState<string>("");
  const [simpleMode, setSimpleMode] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("chempulse:simple-mode") !== "false";
  });
  const toggleSimpleMode = () => {
    setSimpleMode((v) => {
      localStorage.setItem("chempulse:simple-mode", String(!v));
      return !v;
    });
  };
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const [triggered, setTriggered] = useState<PriceAlert[]>([]);
  useEffect(() => {
    const alerts = loadAlerts();
    const prices = Object.fromEntries(allQuotes().map((q) => [q.symbol, q.price]));
    setTriggered(checkTriggeredAlerts(alerts, prices));
  }, []);
  const dismissAlert = (id: string) => {
    setTriggered((t) => t.filter((a) => a.id !== id));
    const remaining = loadAlerts().filter((a) => a.id !== id);
    saveAlerts(remaining);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </span>
            <span className="font-mono text-sm font-bold tracking-wider">
              CHEM<span className="text-primary">PULSE</span>
            </span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <button
              onClick={toggleSimpleMode}
              className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1"
            >
              {simpleMode ? "Simple" : "Advanced"}
            </button>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Activity className="h-3.5 w-3.5 text-up animate-pulse" />
              LIVE
            </span>
            <span className="tabular" suppressHydrationWarning>
              {now || "\u00A0"}
            </span>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs ${
                  active ? "bg-accent text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {triggered.length > 0 && (
        <div className="border-b border-primary/30 bg-primary/10">
          {triggered.map((a) => (
            <div
              key={a.id}
              className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2 sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-2 font-sans text-sm">
                <Bell className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  {a.symbolName} ({a.symbol}) is now {a.direction} ₹{a.threshold} — alert triggered
                </span>
              </div>
              <button
                onClick={() => dismissAlert(a.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Ticker />
      <SimpleModeContext.Provider value={simpleMode}>
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">{children}</main>
      </SimpleModeContext.Provider>
    </div>
  );
}