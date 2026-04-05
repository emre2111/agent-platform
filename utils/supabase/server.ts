import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseConfig } from "@/utils/supabase/config";

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) => {
  const { supabaseUrl, supabaseKey } = assertSupabaseConfig();

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The setAll method can run in a Server Component where writes are disallowed.
        }
      },
    },
  });
};
