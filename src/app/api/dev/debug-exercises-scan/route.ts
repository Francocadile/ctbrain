// src/app/api/dev/debug-exercises-scan/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

function extractB64(desc?: string | null) {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return "";
  const rest = text.slice(idx + EX_TAG.length).trim();
  return (rest.split(/\s+/)[0] || "").trim();
}

export async function GET(req: Request) {
  return new Response("Not implemented", { status: 501 });
}
