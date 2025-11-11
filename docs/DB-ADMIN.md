# DB Admin: Approve users & Prisma Studio

These are small utilities to help approve users and inspect the database locally.

Important: do NOT commit or expose your `DATABASE_URL` publicly. Run these commands in a secure shell.

Open Prisma Studio (reads `.env` or env var):

```bash
# temporary one-liner
DATABASE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require' npx prisma studio

# or using .env file at project root (recommended for local dev only)
# .env content:
# DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

npx prisma studio
```

Approve a single user by email (safe):

```bash
# using env
DATABASE_URL='postgresql://...' EMAIL='jugador@jugador.com' npx tsx scripts/approve-user.ts

# or as arg
DATABASE_URL='postgresql://...' npx tsx scripts/approve-user.ts jugador@jugador.com
```

Approve ALL pending users (use carefully):

```bash
DATABASE_URL='postgresql://...' npx tsx scripts/approve-all-pending.ts
```

If you prefer UI, log in as an Admin and use `/admin/users/pending` to approve one-by-one.
