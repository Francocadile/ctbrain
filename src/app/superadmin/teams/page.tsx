import RoleGate from "@/components/auth/RoleGate";
import { headers } from "next/headers";
import TeamsClient from "./TeamsClient";

export default async function SuperAdminTeamsPage() {
  const heads = headers();
  const host = heads.get("host");
  const protocol = heads.get("x-forwarded-proto") ?? "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;

  let teams: any[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/superadmin/teams`, {
      cache: "no-store",
      credentials: "include",
      headers: {
        cookie: heads.get("cookie") ?? ""
      },
    });

    if (!res.ok) {
      let detail = "";
      try {
        const json = await res.json();
        if (json?.error) detail = ` (${json.error})`;
      } catch {}
      throw new Error(`Status ${res.status}${detail}`);
    }

    teams = await res.json();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <TeamsClient teams={teams} error={error} />
    </RoleGate>
  );
}
