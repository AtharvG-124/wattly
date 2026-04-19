/**
 * Iris web — calls Next.js Route Handlers under /api/* (same origin by default).
 * Set NEXT_PUBLIC_API_URL only if the UI is hosted separately from the API.
 */

function apiOrigin(): string {
  const b = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!b) return "";
  return b.replace(/\/$/, "");
}

const DEMO_USER = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

export function demoHeaders(): HeadersInit {
  return { "x-demo-user-id": DEMO_USER };
}

function url(path: string): string {
  const origin = apiOrigin();
  return origin ? `${origin}${path}` : path;
}

export async function fetchLatest() {
  const res = await fetch(url("/api/readings/latest"), {
    cache: "no-store",
    headers: demoHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<LatestReading | null>;
}

export async function fetchHistory(range: "24h" | "7d" | "30d") {
  const res = await fetch(url(`/api/readings/history?range=${range}`), {
    cache: "no-store",
    headers: demoHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<HistoryPoint[]>;
}

export async function fetchStatsSummary() {
  const res = await fetch(url("/api/stats/summary"), {
    cache: "no-store",
    headers: demoHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<StatsSummary>;
}

export async function patchProfile(body: Record<string, unknown>) {
  const res = await fetch(url("/api/profile"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...demoHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type SeedResult = {
  ok: boolean;
  points: number;
  userId: string;
  persistedToSupabase?: boolean;
  supabaseError?: string | null;
};

export async function seedDemoData(): Promise<SeedResult> {
  const res = await fetch(url("/api/seed"), { method: "POST", headers: demoHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<SeedResult>;
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

export type HistoryPoint = LatestReading;

export type StatsSummary = {
  wasteScoreAvgThisWeek: number;
  wasteScoreAvgLastWeek: number;
  carbonGramsThisWeek: number;
  carbonGramsLastWeek: number;
  savedCo2KgVsLastWeek: number;
  streakDaysGreen: number;
};
