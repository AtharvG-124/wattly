/**
 * Supabase client for React Native (Expo).
 * Uses AsyncStorage for session persistence — same project as web (publishable/anon key).
 *
 * @see https://supabase.com/docs/guides/auth/quickstarts/react-native
 */
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Null when env vars are missing — app still runs for REST-only / demo flows. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
