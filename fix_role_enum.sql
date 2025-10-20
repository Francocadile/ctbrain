-- Cambia el tipo de la columna 'role' en 'UserTeam' de Role_old a Role
ALTER TABLE "UserTeam" ALTER COLUMN "role" TYPE Role USING "role"::text::Role;

-- Cambia el tipo de la columna 'role' en 'Invite' de Role_old a Role
ALTER TABLE "Invite" ALTER COLUMN "role" TYPE Role USING "role"::text::Role;

-- Elimina el tipo antiguo 'Role_old'
DROP TYPE "Role_old";
