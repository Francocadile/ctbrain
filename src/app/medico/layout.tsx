"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopRightLogout from "@/components/auth/TopRightLogout";
import TeamSwitcher from "@/components/nav/TeamSwitcher";

export default function MedicoLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMicrociclo = pathname === "/medico/microciclo";

  return (
    <div className="min-h-screen relative">
      {!isMicrociclo && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
          <TeamSwitcher className="min-w-[160px]" />
          <TopRightLogout />
        </div>
      )}
      {children}
    </div>
  );
}
