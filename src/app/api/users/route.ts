// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// POST /api/users  -> alta pública deshabilitada
export async function POST() {
  return NextResponse.json(
    { error: "Signup público deshabilitado" },
    { status: 403 },
  );
}
