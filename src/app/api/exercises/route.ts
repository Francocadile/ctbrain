// src/app/api/exercises/route.ts
// Alias limpio que reutiliza la implementación de /api/ct/exercises
// (evita cualquier import de NextAuth/authOptions)
export { GET, POST } from "@/app/api/ct/exercises/route";
