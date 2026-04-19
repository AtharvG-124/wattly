import { NextRequest, NextResponse } from "next/server";
import * as mem from "@/lib/iris/memoryStore";
import { getSupabaseAdmin } from "@/lib/iris/supabaseAdmin";

export const runtime = "nodejs";

function userId(req: NextRequest) {
  return (
    req.headers.get("x-demo-user-id") ||
    process.env.DEMO_USER_ID ||
    "00000000-0000-0000-0000-000000000001"
  );
}

export async function GET(req: NextRequest) {
  const uid = userId(req);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (data) return NextResponse.json(data);
  }
  const p = mem.getProfile(uid);
  if (!p) return NextResponse.json({ error: "No profile" }, { status: 404 });
  return NextResponse.json({
    id: p.id,
    home_size_sqft: p.home_size_sqft,
    num_rooms: p.num_rooms,
    country: p.country,
    monthly_bill_usd: p.monthly_bill_usd,
    grid_carbon_g_per_kwh: p.grid_carbon_g_per_kwh,
  });
}

export async function PATCH(req: NextRequest) {
  const uid = userId(req);
  let body: Partial<{
    home_size_sqft: number;
    num_rooms: number;
    country: string;
    monthly_bill_usd: number;
    grid_carbon_g_per_kwh: number;
  }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("profiles").upsert({ id: uid, ...body }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  mem.upsertProfile(uid, body);
  return NextResponse.json(mem.getProfile(uid));
}
