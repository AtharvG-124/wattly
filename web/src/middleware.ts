import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function withApiCors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-key, x-demo-user-id, Authorization"
  );
  return res;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api") && request.method === "OPTIONS") {
    return withApiCors(new NextResponse(null, { status: 204 }));
  }

  const res = await updateSession(request);

  if (path.startsWith("/api")) {
    return withApiCors(res);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
