// src/lib/videos.ts
export type VideoItem = {
  id: string;
  title: string;
  url: string;
  scope: "equipo" | "individual";
  tag?: string; // opcional
  createdAt: string; // ISO
};

const LS_VIDEOS = "ct_videos_v1";

function read(): VideoItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_VIDEOS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function write(list: VideoItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_VIDEOS, JSON.stringify(list));
}

export function listVideos(): VideoItem[] { return read().sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).reverse(); }
export function addVideo(v: Omit<VideoItem,"id"|"createdAt">) {
  const item: VideoItem = { ...v, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const all = [item, ...read()];
  write(all);
  return item;
}
export function removeVideo(id: string) {
  write(read().filter(v => v.id !== id));
}
