import { NextRequest, NextResponse } from "next/server";
import * as mem from "@/lib/iris/memoryStore";
import { getSupabaseAdmin } from "@/lib/iris/supabaseAdmin";

export const runtime = "nodejs";

function resolveUserId(req: NextRequest): string {
  return (
    req.headers.get("x-demo-user-id") ||
    process.env.DEMO_USER_ID ||
    "00000000-0000-0000-0000-000000000001"
  );
}

export async function GET(req: NextRequest) {
  const userId = resolveUserId(req);
  const supabase = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);

  let thisWeekAvg = 0;
  let lastWeekAvg = 0;
  let thisWeekCarbon = 0;
  let lastWeekCarbon = 0;

  const computeFromRows = (rows: { waste_score: number; carbon_grams_est: number; recorded_at: string }[]) => {
    const slice = (start: Date, end: Date) =>
      rows.filter((r) => {
        const t = new Date(r.recorded_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      });
    const thisW = slice(weekAgo, new Date());
    const lastW = slice(twoWeeksAgo, weekAgo);
    const avg = (arr: typeof rows) =>
      arr.length ? arr.reduce((a, b) => a + b.waste_score, 0) / arr.length : 0;
    const carb = (arr: typeof rows) => arr.reduce((a, b) => a + (b.carbon_grams_est || 0), 0);
    thisWeekAvg = avg(thisW);
    lastWeekAvg = avg(lastW);
    thisWeekCarbon = carb(thisW);
    lastWeekCarbon = carb(lastW);
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("waste_score, carbon_grams_est, recorded_at")
      .eq("user_id", userId)
      .gte("recorded_at", twoWeeksAgo.toISOString());
    if (!error && (data?.length ?? 0) > 0) {
      computeFromRows(data ?? []);
    } else {
      const rows = mem.listReadings(userId, twoWeeksAgo);
      computeFromRows(
        rows.map((r) => ({
          waste_score: r.waste_score,
          carbon_grams_est: r.carbon_grams_est,
          recorded_at: r.recorded_at,
        }))
      );
    }
  } else {
    const rows = mem.listReadings(userId, twoWeeksAgo);
    computeFromRows(
      rows.map((r) => ({
        waste_score: r.waste_score,
        carbon_grams_est: r.carbon_grams_est,
        recorded_at: r.recorded_at,
      }))
    );
  }

  const savedKg =
    lastWeekCarbon > 0 && thisWeekCarbon < lastWeekCarbon
      ? (lastWeekCarbon - thisWeekCarbon) / 1000
      : 0;

  return NextResponse.json({
    wasteScoreAvgThisWeek: Math.round(thisWeekAvg),
    wasteScoreAvgLastWeek: Math.round(lastWeekAvg),
    carbonGramsThisWeek: Math.round(thisWeekCarbon),
    carbonGramsLastWeek: Math.round(lastWeekCarbon),
    savedCo2KgVsLastWeek: Math.round(savedKg * 100) / 100,
    streakDaysGreen: thisWeekAvg < 35 ? 3 : 0,
  });
}
