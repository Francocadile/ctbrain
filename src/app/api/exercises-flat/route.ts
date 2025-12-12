import { NextResponse } from "next/server";

export async function GET(_req: Request) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
