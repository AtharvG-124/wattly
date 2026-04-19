import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    cwd: process.cwd(),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    deviceApiKeySet: Boolean(process.env.WATTLY_DEVICE_API_KEY),
    demoUserId: process.env.DEMO_USER_ID ?? "(default)",
  });
}
