import { flags } from "@/lib/flags";

export default function HomePage() {
  return (
    <div className="container-aura p-6">
      <h2 className="mb-3 text-2xl font-semibold">Checklist Fase 0</h2>
      <ul className="list-inside list-disc space-y-2 text-white/90">
        <li>Tailwind OK y diseño base con “aura campeón”.</li>
        <li>CI/CD con GitHub Actions: lint, typecheck, build.</li>
        <li>Validación de variables con Zod.</li>
        <li>
          Feature flags activos:
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs">
            Exercises: {String(flags.exercises)}
          </span>
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs">
            Videos: {String(flags.videos)}
          </span>
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs">
            Reports: {String(flags.reports)}
          </span>
        </li>
      </ul>

      <div className="mt-6 text-sm text-white/70">
        Próximo paso: Fase 1 (Prisma + Neon + NextAuth + roles).
      </div>
    </div>
  );
}
