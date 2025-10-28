# CTBrain — Resumen Técnico (solo lectura)

* Fecha/hora (local): 28 de octubre de 2025
* Branch actual y estado git: `chore/auth-rolegate-guards` (ver detalles en git status)

## 1) Ambiente y dependencias

* Node: v20.13.1
* npm: 10.5.2
* Prisma CLI: 6.18.0
* @prisma/client: 6.18.0
* TypeScript: 5.5.4
* Sistema operativo: darwin-arm64

## 2) Prisma (schema y migraciones)

* El schema es válido (`prisma validate` OK)
* Ocurrencias de `enum SessionType`: 1 (línea 20)
* No hay `@default(GENERAL)` en el schema
* Modelos clave detectados:
  - `User` con campo `approved` (línea 99)
  - `User` con campo `teamId` (línea 102)
  - Relación `team` en User (línea 103)
  - Modelo `Team` (línea 376)
  - Modelo `UserTeam` (línea 386)
  - Modelo `TrainingSession` (línea 401)
* Migraciones detectadas:
  - Carpeta `prisma/migrations` existe
  - Migración principal: `2025-08-28_add_sessions/migration.sql`

## 3) Auth & sesión

* Uso de credenciales y bcrypt para hash de password
* Callbacks JWT/Session inyectan: id, role, teamId, approved
* Gate de signIn redirige a `/pending-approval` si no está aprobado, con bypass para SUPERADMIN

## 4) Middleware

* No se muestra el matcher ni rutas públicas en la salida, pero el sistema implementa control de acceso por roles y aprobación
* Bypass para SUPERADMIN presente en lógica de signIn
* Cobertura de `/api` no detallada en la salida

## 5) API & seguridad

* Total de rutas API: 59
* Rutas API con `getServerSession(authOptions)`: 7
  - Ejemplos: `src/app/api/admin/users/[id]/approve/route.ts`, `src/app/api/auth/me/route.ts`, `src/app/api/ct/exercises/route.ts`, etc.
* Lugares candidatos para filtrar por `teamId`: endpoints que gestionan usuarios, equipos y sesiones

## 6) UI y RoleGate

* RoleGate referenciado en:
  - `src/app/directivo/page.tsx` (rol DIRECTIVO)
  - `src/app/admin/users/page.tsx` (rol ADMIN)
  - `src/app/admin/page.tsx` (rol ADMIN)
  - `src/app/medico/wellness/page.tsx` (rol MEDICO)
  - `src/app/medico/page.tsx` (rol MEDICO)
  - `src/app/medico/protocolos/page.tsx` (rol MEDICO)
  - Componente: `src/components/auth/RoleGate.tsx`
* Los roles usados son strings, consistentes con el schema

## 7) Problemas que bloquean el build/CI

* No se detectan enums duplicados ni defaults inválidos en el schema actual
* No se reportan otros problemas críticos en la salida

## 8) Plan mínimo siguiente (idempotente, por fases)

* Fase A (desbloquear build): deduplicar `SessionType`, remover `@default(GENERAL)`, `prisma validate → generate` (ya OK)
* Fase B (seed): SUPERADMIN aprobado + password hashed (ya OK)
* Fase C (multi-equipo): CRUD `Team`, `UserTeam`, asignación CT, selector de equipo; filtros `teamId` en endpoints claves
* Fase D (hardening): zod validations, sanitización, logging
* Comandos de verificación por cada fase: ver prompt original

---

**Este resumen fue generado solo en modo lectura, sin modificar ningún archivo ni la base de datos.**
