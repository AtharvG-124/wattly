import { NextRequest, NextResponse } from "next/server";
import * as mem from "@/lib/wattly/memoryStore";
import { getSupabaseAdmin } from "@/lib/wattly/supabaseAdmin";

export const runtime = "nodejs";

function resolveUserId(req: NextRequest): string {
  return (
    req.headers.get("x-demo-user-id") ||
    process.env.DEMO_USER_ID ||
    "00000000-0000-0000-0000-000000000001"
  );
}

function rangeToDate(range: string): Date {
  const now = Date.now();
  switch (range) {
    case "7d":
      return new Date(now - 7 * 86400000);
    case "30d":
      return new Date(now - 30 * 86400000);
    case "24h":
    default:
      return new Date(now - 86400000);
  }
}

function mapRow(r: Record<string, unknown>) {
  return {
    temperature: r.temperature_c,
    lightLevel: r.light_level,
    soundLevel: r.sound_level,
    motionDetected: r.motion_detected,
    roomId: r.room_id,
    wasteScore: r.waste_score,
    carbonGramsEst: r.carbon_grams_est,
    recordedAt: r.recorded_at,
  };
}

function mapMemoryRow(r: mem.ReadingRow) {
  return {
    temperature: r.temperature,
    lightLevel: r.lightLevel,
    soundLevel: r.soundLevel,
    motionDetected: r.motionDetected,
    roomId: r.room_id,
    wasteScore: r.waste_score,
    carbonGramsEst: r.carbon_grams_est,
    recordedAt: r.recorded_at,
  };
}

export async function GET(req: NextRequest) {
  const userId = resolveUserId(req);
  const range = req.nextUrl.searchParams.get("range") || "24h";
  const since = rangeToDate(range);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("*")
      .eq("user_id", userId)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map((row) => mapRow(row as Record<string, unknown>)));
  }

  const rows = mem.listReadings(userId, since).reverse();
  return NextResponse.json(rows.map(mapMemoryRow));
}
