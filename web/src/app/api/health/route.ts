import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, service: "iris-next", ts: new Date().toISOString() });
}
