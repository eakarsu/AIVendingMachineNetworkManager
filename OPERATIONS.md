# Operations

Copy `.env.example` to `.env`, replace placeholders, provision PostgreSQL/dependencies, then run `cd backend && npm run migrate`. Start with `./start.sh`.

Startup does not install, seed, migrate, create databases, start services, or kill ports. Run `npm test` in `backend`. Payment, tax, inventory, delivery, messaging, and accounting rows are typed idempotent delivery contracts; they are not live integrations until a separately configured adapter records a verified acknowledgement. Refund limits and tenant/subject scopes remain enforced in the authoritative workflow.

The legacy seed truncates demo data and is guarded by `ALLOW_DESTRUCTIVE_DEMO_SEED=true`; use it only for an isolated disposable database.
