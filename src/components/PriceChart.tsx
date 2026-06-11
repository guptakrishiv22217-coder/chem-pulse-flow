import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/market-data";
import { fmt } from "@/lib/market-data";

interface Props {
  data: PricePoint[];
  height?: number;
  color?: string;
  compact?: boolean;
}

export function PriceChart({ data, height = 280, color, compact }: Props) {
  const stroke = color ?? "var(--color-primary)";
  const gid = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`px-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && (
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
        )}
        {!compact && (
          <XAxis
            dataKey="date"
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v) => v.slice(5)}
            minTickGap={48}
          />
        )}
        {!compact && (
          <YAxis
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            domain={["auto", "auto"]}
            width={56}
            tickFormatter={(v) => fmt(v, 0)}
          />
        )}
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--color-muted-foreground)" }}
          formatter={(v: number) => [fmt(v), "Price"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={stroke}
          strokeWidth={1.6}
          fill={`url(#px-${gid})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}