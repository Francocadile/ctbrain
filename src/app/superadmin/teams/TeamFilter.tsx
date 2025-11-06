"use client";
// src/app/superadmin/teams/TeamFilter.tsx
import { useState } from "react";

interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
}

interface TeamFilterProps {
  teams: Team[];
  onSelect: (filtered: Team[]) => void;
}

export default function TeamFilter({ teams, onSelect }: TeamFilterProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    const filtered = teams.filter(
      (team) =>
        team.name.toLowerCase().includes(value.toLowerCase()) ||
        team.id.toLowerCase().includes(value.toLowerCase())
    );
    onSelect(filtered);
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <input
        type="text"
        className="border rounded px-3 py-2 w-64"
        placeholder="Buscar equipo por nombre o ID..."
        value={query}
        onChange={handleChange}
      />
    </div>
  );
}
