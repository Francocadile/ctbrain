"use client";

import { ReactNode } from "react";
import TopRightLogout from "@/components/auth/TopRightLogout";

export default function MedicoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <TopRightLogout />
      {children}
    </div>
  );
}
