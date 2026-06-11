import { createClient } from "@supabase/supabase-js";

const url =
  import.meta.env.VITE_SUPABASE_URL ??
  (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined);
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined);

if (!url || !key) {
  throw new Error("Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).");
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== "undefined",
  },
});