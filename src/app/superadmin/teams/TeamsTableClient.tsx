"use client";
import { useEffect, useState } from "react";
import TeamRow from "./TeamRow";
import TeamFilterWrapper from "./TeamFilter";
import CreateTeamForm from "./CreateTeamForm";
import RoleGateClient from "@/components/auth/RoleGateClient";

export default function TeamsTableClient() {
  const [teams, setTeams] = useState<any[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<any[]>([]);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/superadmin/teams");
        if (res.status === 403) throw new Error("No tienes permisos para ver los equipos. Verifica tu sesión SUPERADMIN.");
        if (!res.ok) throw new Error("No se pudo cargar la lista de equipos");
        const data = await res.json();
        console.log("[DEBUG] Equipos recibidos:", data);
        let teamsArr = Array.isArray(data) ? data : (data.teams || []);
        // Enriquecer equipos con adminEmail y CTs
        const usersRes = await fetch("/api/superadmin/users");
        let users = [];
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          console.log("[DEBUG] Usuarios recibidos:", usersData);
          users = Array.isArray(usersData) ? usersData : (usersData.users || []);
        }
        teamsArr = teamsArr.map((team: any) => {
          const admin = users.find((u: any) => u.role === "ADMIN" && u.teamId === team.id);
          const cts = users.filter((u: any) => u.role === "CT" && u.teamId === team.id);
          return {
            ...team,
            adminEmail: admin?.email || "",
            cts: cts.map((ct: any) => ({ id: ct.id, email: ct.email })),
          };
        });
        console.log("[DEBUG] Equipos procesados:", teamsArr);
        setTeams(teamsArr);
        setFilteredTeams(teamsArr);
      } catch (e: any) {
        setError(e.message || "Error desconocido");
      }
      setLoading(false);
    }
    fetchTeams();
  }, []);

  return (
    <RoleGateClient allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma.</p>
        <div className="mt-6">
          <CreateTeamForm />
        </div>
        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}
        <section className="mt-8">
          <TeamFilterWrapper teams={teams} onSelect={setFilteredTeams} />
          <table className="min-w-full border rounded-xl bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Logo</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Email ADMIN</th>
                <th className="px-4 py-2 text-left">CTs</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-4 text-gray-400">Cargando equipos...</td></tr>
              ) : filteredTeams.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-4 text-gray-400">No hay equipos registrados.</td></tr>
              ) : (
                filteredTeams.map((team: any) => (
                  <TeamRow key={team.id} team={team} adminEmail={team.adminEmail} />
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGateClient>
  );
}
