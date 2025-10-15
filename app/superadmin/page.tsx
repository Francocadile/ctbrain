import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SuperadminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") return null;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Panel Superadmin (beta)</h1>
      <p className="mt-2 text-gray-500">Acceso exclusivo para usuarios SUPERADMIN.</p>
    </div>
  );
}
