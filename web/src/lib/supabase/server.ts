import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Server Supabase client — use in Server Components, Route Handlers, Server Actions.
 * Creates a fresh client per request (recommended for Fluid / serverless).
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — middleware refresh handles session.
        }
      },
    },
  });
}
