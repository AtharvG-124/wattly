import { NextRequest, NextResponse } from "next/server";
import * as mem from "@/lib/iris/memoryStore";
import { computeWasteScore, estimateCarbonGramsPerDay } from "@/lib/iris/wasteScore";
import { getSupabaseAdmin } from "@/lib/iris/supabaseAdmin";

export const runtime = "nodejs";

function allowSeed(req: NextRequest): boolean {
  if (process.env.SEED_PROTECTED !== "true") return true;
  const key = process.env.IRIS_DEVICE_API_KEY ?? process.env.WATTLY_DEVICE_API_KEY ?? "dev-secret-change-me";
  const sent = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return sent === key;
}

export async function POST(req: NextRequest) {
  if (!allowSeed(req)) {
    return NextResponse.json({ error: "Invalid API key for seed" }, { status: 401 });
  }

  const userId =
    req.headers.get("x-demo-user-id") ||
    process.env.DEMO_USER_ID ||
    "00000000-0000-0000-0000-000000000001";

  mem.seedDemoUser(userId);
  const profile = mem.getProfile(userId)!;
  const now = Date.now();
  const points = 48;
  const supabase = getSupabaseAdmin();
  const supabaseRows: Record<string, unknown>[] = [];

  for (let i = points; i >= 0; i--) {
    const t = new Date(now - i * 30 * 60 * 1000);
    const hour = t.getHours();
    const temp = 20 + Math.sin(hour / 24) * 4 + (Math.random() - 0.5) * 2;
    const light = hour > 7 && hour < 22 ? 400 + Math.random() * 400 : 50 + Math.random() * 80;
    const motion = Math.random() > 0.45;
    const sound = 200 + Math.random() * 400;
    const waste = computeWasteScore({
      temperatureC: temp,
      lightLevel: light,
      soundLevel: sound,
      motionDetected: motion,
      minutesLightOnWithoutMotion: motion ? 0 : 20 + Math.random() * 40,
      settings: {
        tempThresholdHighC: 24,
        lightThreshold: 400,
        noiseThreshold: 600,
        motionAbsenceAlertMins: 30,
      },
    });
    const carbon = estimateCarbonGramsPerDay({
      wasteScore: waste,
      homeSizeSqft: profile.home_size_sqft,
      monthlyBillUsd: profile.monthly_bill_usd,
      gridCarbonGPerKwh: profile.grid_carbon_g_per_kwh,
    });

    const temperature = Math.round(temp * 10) / 10;
    const lightLevel = Math.round(light);
    const soundLevel = Math.round(sound);
    const recordedAt = t.toISOString();
    const wasteRounded = Math.min(100, Math.max(0, Math.round(waste)));

    mem.addReading({
      user_id: userId,
      device_id: "iris-demo-device",
      room_id: "living-room",
      temperature,
      lightLevel,
      soundLevel,
      motionDetected: motion,
      waste_score: wasteRounded,
      carbon_grams_est: carbon,
      recorded_at: recordedAt,
    });

    if (supabase) {
      supabaseRows.push({
        device_id: "iris-demo-device",
        user_id: userId,
        room_id: "living-room",
        temperature_c: temperature,
        light_level: lightLevel,
        sound_level: soundLevel,
        motion_detected: motion,
        waste_score: wasteRounded,
        carbon_grams_est: carbon,
        recorded_at: recordedAt,
      });
    }
  }

  let supabaseError: string | null = null;
  if (supabase && supabaseRows.length > 0) {
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: userId,
      email: profile.email ?? "demo@iris.app",
      home_size_sqft: profile.home_size_sqft,
      num_rooms: profile.num_rooms,
      country: profile.country,
      monthly_bill_usd: profile.monthly_bill_usd,
      grid_carbon_g_per_kwh: profile.grid_carbon_g_per_kwh,
    });
    if (pErr) {
      supabaseError = `profiles: ${pErr.message}`;
    } else {
      const { error: dErr } = await supabase.from("devices").upsert({
        id: "iris-demo-device",
        user_id: userId,
        room_id: "living-room",
        room_label: "Living Room",
      });
      if (dErr) {
        supabaseError = `devices: ${dErr.message}`;
      } else {
        const { error } = await supabase.from("sensor_readings").insert(supabaseRows);
        if (error) supabaseError = error.message;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    points: points + 1,
    userId,
    persistedToSupabase: Boolean(supabase && !supabaseError),
    supabaseError,
  });
}
