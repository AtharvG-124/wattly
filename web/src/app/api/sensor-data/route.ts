import { NextRequest, NextResponse } from "next/server";
import { computeWasteScore, estimateCarbonGramsPerDay } from "@/lib/wattly/wasteScore";
import { getSupabaseAdmin } from "@/lib/wattly/supabaseAdmin";
import * as mem from "@/lib/wattly/memoryStore";
import { minutesSinceMotion } from "@/lib/wattly/presence";
import type { SensorPayload } from "@/lib/wattly/types";

export const runtime = "nodejs";

const DEFAULT_SETTINGS = {
  tempThresholdHighC: 24,
  lightThreshold: 400,
  noiseThreshold: 600,
  motionAbsenceAlertMins: 30,
};

function authDevice(req: NextRequest): boolean {
  const key = process.env.WATTLY_DEVICE_API_KEY ?? "dev-secret-change-me";
  const header = req.headers.get("x-api-key");
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const sent = header ?? auth;
  return sent === key;
}

export async function POST(req: NextRequest) {
  if (!authDevice(req)) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  let body: SensorPayload;
  try {
    body = (await req.json()) as SensorPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    temperature,
    lightLevel,
    soundLevel,
    motionDetected,
    roomId = "living-room",
    deviceId = "wattly-demo-device",
    timestamp,
  } = body;

  if (
    typeof temperature !== "number" ||
    typeof lightLevel !== "number" ||
    typeof soundLevel !== "number" ||
    typeof motionDetected !== "boolean"
  ) {
    return NextResponse.json(
      {
        error:
          "Expected { temperature, lightLevel, soundLevel, motionDetected, roomId?, deviceId?, timestamp? }",
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const demoUser = process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

  let userId = demoUser;
  const dev = mem.getDevice(deviceId);
  if (dev) userId = dev.user_id;

  const mins = minutesSinceMotion(deviceId, roomId, motionDetected);
  const wasteScore = computeWasteScore({
    temperatureC: temperature,
    lightLevel,
    soundLevel,
    motionDetected,
    minutesLightOnWithoutMotion: motionDetected ? 0 : mins,
    settings: DEFAULT_SETTINGS,
  });

  const profile = mem.getProfile(userId);
  const carbon = estimateCarbonGramsPerDay({
    wasteScore,
    homeSizeSqft: profile?.home_size_sqft ?? 1500,
    monthlyBillUsd: profile?.monthly_bill_usd ?? 120,
    gridCarbonGPerKwh: profile?.grid_carbon_g_per_kwh ?? 386,
  });

  const recordedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  if (supabase) {
    void (async () => {
      const { error } = await supabase.from("sensor_readings").insert({
        device_id: deviceId,
        user_id: userId,
        room_id: roomId,
        temperature_c: temperature,
        light_level: lightLevel,
        sound_level: soundLevel,
        motion_detected: motionDetected,
        waste_score: wasteScore,
        carbon_grams_est: carbon,
        recorded_at: recordedAt,
      });
      if (error) console.error("Supabase insert error:", error.message);
    })();
  }

  mem.addReading({
    user_id: userId,
    device_id: deviceId,
    room_id: roomId,
    temperature,
    lightLevel,
    soundLevel,
    motionDetected,
    waste_score: wasteScore,
    carbon_grams_est: carbon,
    recorded_at: recordedAt,
  });

  return NextResponse.json(
    {
      ok: true,
      wasteScore,
      carbonGramsEstDay: carbon,
      recordedAt,
    },
    { status: 201 }
  );
}
