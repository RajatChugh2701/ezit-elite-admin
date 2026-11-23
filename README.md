# EZIT ELITE Admin & Operations Portal

Phase 1 operations portal built with Next.js 16, React 19, TypeScript, PostgreSQL 19 and Drizzle ORM. The UI uses Radix UI for accessible selects, menus and dialogs; searchable comboboxes use cmdk.

## Run locally

Requires Node.js 22.22+ and Docker Desktop.

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d db
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. PostgreSQL maps to host port `5433` to avoid colliding with a local PostgreSQL service. On a new database, create the first Admin account in the app. To preserve an existing SQLite installation, migrate the schema first, then import its accounts and records:

```powershell
npm run db:migrate
npm run db:import-legacy
```

The importer reads `data/ezit.db` (`LEGACY_SQLITE_PATH` and `PYTHON` can override its location and Python command), refuses to mix with an existing target account set, and does not copy sessions. Existing Admin credentials continue to work; the password hash upgrades on first login. Keep a backup of the SQLite file before migration.

## Included workflows

- Members: a combined Members and Applications workspace; approving an application creates a member in Pending Payment status.
- Plans and services: configurable catalogue, terms, cities and pricing.
- Requests and bookings: status updates, PE assignment, city and shift checks, and overlapping booking prevention.
- Payments and invoices: operational records with paid states protected for verified gateway events.
- Users (Personal Executives), dashboard, reports and an administrative audit log.
- Reusable searchable selects for cities and linked records; accessible dropdown selects for statuses and filters.

The portal's demo records are clearly marked and use reserved `.test` email addresses; paid states and member activation still require a verified payment event. External payment, identity/OTP, CRM, accounting, maps and messaging integrations are not configured. Production deployment still needs TLS, managed secrets, backups, monitoring, rate limits and an external security review.
