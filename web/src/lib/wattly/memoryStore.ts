/**
 * In-memory store when Supabase env is missing — dev / single-node only.
 * For production, configure Supabase (persists across serverless instances).
 */

import { randomUUID } from "crypto";
import type { SensorPayload } from "./types";

export type Profile = {
  id: string;
  email?: string;
  home_size_sqft: number;
  num_rooms: number;
  country: string;
  monthly_bill_usd: number;
  grid_carbon_g_per_kwh: number;
};

export type ReadingRow = SensorPayload & {
  id: string;
  waste_score: number;
  carbon_grams_est: number;
  recorded_at: string;
  user_id: string;
  device_id: string;
  room_id: string;
};

const profiles = new Map<string, Profile>();
const readings: ReadingRow[] = [];
const devices = new Map<string, { user_id: string; room_id: string; room_label: string }>();

export function seedDemoUser(userId: string) {
  if (!profiles.has(userId)) {
    profiles.set(userId, {
      id: userId,
      email: "demo@wattly.app",
      home_size_sqft: 1800,
      num_rooms: 4,
      country: "US",
      monthly_bill_usd: 140,
      grid_carbon_g_per_kwh: 386,
    });
  }
  const devId = "wattly-demo-device";
  devices.set(devId, { user_id: userId, room_id: "living-room", room_label: "Living Room" });
}

export function getProfile(userId: string) {
  return profiles.get(userId);
}

export function upsertProfile(userId: string, p: Partial<Profile>) {
  const cur = profiles.get(userId) ?? {
    id: userId,
    home_size_sqft: 1500,
    num_rooms: 3,
    country: "US",
    monthly_bill_usd: 120,
    grid_carbon_g_per_kwh: 386,
  };
  profiles.set(userId, { ...cur, ...p, id: userId });
}

export function getDevice(deviceId: string) {
  return devices.get(deviceId);
}

export function addReading(
  row: Omit<ReadingRow, "id" | "recorded_at"> & { recorded_at?: string }
): ReadingRow {
  const id = randomUUID();
  const recorded_at = row.recorded_at ?? new Date().toISOString();
  const full: ReadingRow = { ...row, id, recorded_at };
  readings.push(full);
  if (readings.length > 5000) readings.splice(0, readings.length - 5000);
  return full;
}

export function listReadings(userId: string, since?: Date) {
  return readings
    .filter((r) => r.user_id === userId && (!since || new Date(r.recorded_at) >= since))
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
}

export function latestReading(userId: string) {
  return listReadings(userId)[0];
}

seedDemoUser(process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001");
