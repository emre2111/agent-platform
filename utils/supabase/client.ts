import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseConfig } from "@/utils/supabase/config";

export const createClient = () => {
  const { supabaseUrl, supabaseKey } = assertSupabaseConfig();
  return createBrowserClient(supabaseUrl, supabaseKey);
};
