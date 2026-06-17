CREATE TABLE public.commodities (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  unit TEXT NOT NULL DEFAULT 'kg',
  change_pct NUMERIC NOT NULL DEFAULT 0,
  change_wk NUMERIC NOT NULL DEFAULT 0,
  change_mo NUMERIC NOT NULL DEFAULT 0,
  low_52 NUMERIC NOT NULL DEFAULT 0,
  high_52 NUMERIC NOT NULL DEFAULT 0,
  volatility_score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commodities TO anon, authenticated;
GRANT ALL ON public.commodities TO service_role;
ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Commodities are publicly readable" ON public.commodities FOR SELECT USING (true);