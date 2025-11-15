import RoleGate from "@/components/auth/RoleGate";
import { headers } from "next/headers";
import Link from "next/link";
import TeamUsersClient from "./TeamUsersClient";
import type {
  SuperadminTeam,
  TeamUserAssignment,
  SuperadminUserSummary,
} from "../../types";

async function fetchJson<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const res = await fetch(url, init);
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const error = typeof payload?.error === "string" ? payload.error : `Status ${res.status}`;
    return { ok: false, error };
  }
  return { ok: true, data: payload as T };
}

export default async function TeamUsersPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const heads = headers();
  const host = heads.get("host");
  const protocol = heads.get("x-forwarded-proto") ?? "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
  const cookie = heads.get("cookie") ?? "";

  const fetchOptions: RequestInit = {
    cache: "no-store",
    credentials: "include",
    headers: {
      cookie,
    },
  };

  const [teamResult, userTeamsResult, usersResult] = await Promise.all([
    fetchJson<SuperadminTeam>(`${baseUrl}/api/superadmin/teams/${teamId}`, fetchOptions),
    fetchJson<{ data: TeamUserAssignment[] }>(`${baseUrl}/api/superadmin/user-teams`, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        "x-team": teamId,
      },
    }),
    fetchJson<SuperadminUserSummary[]>(`${baseUrl}/api/superadmin/users`, fetchOptions),
  ]);

  const team = teamResult.ok ? teamResult.data : null;
  const assignments = userTeamsResult.ok ? userTeamsResult.data.data : [];
  const users = usersResult.ok ? usersResult.data : [];
  const initialError =
    (!teamResult.ok && teamResult.error) ||
    (!userTeamsResult.ok && userTeamsResult.error) ||
    (!usersResult.ok && usersResult.error) ||
    null;

  if (!team) {
    return (
      <RoleGate allow={["SUPERADMIN"]}>
        <main className="min-h-[60vh] px-6 py-12">
          <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold">Equipo no disponible</h1>
            <p className="mt-3 text-sm text-gray-600">
              {initialError || "No pudimos cargar la información del equipo."}
            </p>
            <div className="mt-6">
              <Link
                href="/superadmin/teams"
                className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Volver a equipos
              </Link>
            </div>
          </div>
        </main>
      </RoleGate>
    );
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <TeamUsersClient
        team={team}
        assignments={assignments}
        users={users}
        initialError={initialError}
      />
    </RoleGate>
  );
}
