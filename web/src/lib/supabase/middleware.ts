import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Refreshes the user session in middleware so auth cookies stay in sync.
 * Wattly stays usable without login — we do not redirect to /login here.
 * To protect routes later, add checks after `getUser()` (see Supabase UI docs).
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublishableKey();

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
