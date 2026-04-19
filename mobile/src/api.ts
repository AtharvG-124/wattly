/**
 * Shared API shape with web — point EXPO_PUBLIC_API_URL at your machine (LAN IP for device).
 * When signed in with Supabase, sends that user id so the API can align with your DB (optional).
 */

import { supabase } from "./lib/supabase";
import { API_BASE_URL } from "./config";

const BASE = API_BASE_URL.replace(/\/$/, "");
const DEMO_USER = process.env.EXPO_PUBLIC_DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

async function demoUserHeader(): Promise<Record<string, string>> {
  const session = await supabase?.auth.getSession();
  const uid = session?.data.session?.user?.id;
  return { "x-demo-user-id": uid ?? DEMO_USER };
}

function friendlyFetchError(e: unknown): Error {
  const raw = e instanceof Error ? e.message : String(e);
  if (/Network request failed|Failed to fetch|network error/i.test(raw)) {
    return new Error(
      "Cannot reach Wattly. On a phone, use your computer's LAN IP + port 3000, e.g. http://192.168.1.5:3000. Run Next.js: cd wattly/web && npm run dev. Then restart Expo: npx expo start --clear"
    );
  }
  return e instanceof Error ? e : new Error(raw);
}

export async function fetchLatest() {
  try {
    const res = await fetch(`${BASE}/api/readings/latest`, {
      headers: await demoUserHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<LatestReading | null>;
  } catch (e) {
    throw friendlyFetchError(e);
  }
}

export type LatestReading = {
  temperature: number;
  lightLevel: number;
  soundLevel: number;
  motionDetected: boolean;
  roomId: string;
  wasteScore: number;
  carbonGramsEst: number;
  recordedAt: string;
};
