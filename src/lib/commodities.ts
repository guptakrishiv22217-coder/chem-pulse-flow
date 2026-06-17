import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Commodity {
  symbol: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  unit: string;
  change_pct: number;
  change_wk: number;
  change_mo: number;
  low_52: number;
  high_52: number;
  volatility_score: number;
  updated_at: string;
}

export async function fetchCommodities(): Promise<Commodity[]> {
  const { data, error } = await supabase
    .from("commodities")
    .select("*")
    .order("symbol", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Commodity[];
}

export function useCommodities() {
  return useQuery({
    queryKey: ["commodities"],
    queryFn: fetchCommodities,
    staleTime: 30_000,
  });
}

export const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });

export const inr = (n: number) => `₹${fmt(n)}`;
