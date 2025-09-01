// src/lib/player.ts
const KEY = "player_name";

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) || "";
}

export function setPlayerName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, String(name || "").trim());
}

export function clearPlayerName() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
