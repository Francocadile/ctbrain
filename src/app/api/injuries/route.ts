import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Proxy simple a /api/med/clinical?date=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || "";
  if (!date) return NextResponse.json([], { status: 200 });

  const res = await fetch(`${url.origin}/api/med/clinical?date=${encodeURIComponent(date)}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) return NextResponse.json([], { status: 200 });
  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
