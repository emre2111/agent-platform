const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export function getSupabaseConfig() {
  return {
    supabaseUrl,
    supabaseKey,
    isConfigured: Boolean(supabaseUrl && supabaseKey),
  };
}

export function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  return {
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
  } as { supabaseUrl: string; supabaseKey: string };
}
