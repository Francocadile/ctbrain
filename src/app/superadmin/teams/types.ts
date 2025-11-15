export type SuperadminTeam = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackPayload = {
  type: "success" | "error";
  message: string;
  refresh?: boolean;
};

export const TEAM_ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "CT", label: "Cuerpo Técnico" },
  { value: "MEDICO", label: "Médico" },
  { value: "JUGADOR", label: "Jugador" },
  { value: "DIRECTIVO", label: "Directivo" },
] as const;

export type TeamRoleValue = (typeof TEAM_ROLE_OPTIONS)[number]["value"];

export type SuperadminUserSummary = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export type TeamUserAssignment = {
  id: string;
  userId: string;
  role: TeamRoleValue;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};
