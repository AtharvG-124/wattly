import { createBrowserClient } from "@supabase/ssr";

/** Prefer publishable key (Supabase dashboard); legacy `anon` JWT still supported. */
function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Browser Supabase client — use in Client Components.
 * Returns `null` when env is missing so Iris can run in API-only / demo mode.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

/** @deprecated Use `createClient()` — alias for older Iris imports */
export const createSupabaseBrowserClient = createClient;
