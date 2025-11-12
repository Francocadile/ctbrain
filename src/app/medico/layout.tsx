"use client";

import { ReactNode } from "react";
import TopRightLogout from "@/components/auth/TopRightLogout";
import TeamSwitcher from "@/components/nav/TeamSwitcher";

export default function MedicoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <div className="absolute left-4 top-4 z-40">
        <TeamSwitcher className="min-w-[160px]" />
      </div>
      <TopRightLogout />
      {children}
    </div>
  );
}
