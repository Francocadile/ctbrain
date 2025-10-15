import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPERADMIN") return null;
  return <>{children}</>;
}
