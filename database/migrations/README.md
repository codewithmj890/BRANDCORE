# BRANDCORE — Database Migrations

**Owner:** Mritunjay Singh
**Status:** No migrations yet — waiting for Cloudflare Python Workers proof-of-concept gate to pass.

---

## Migration Approach

Migrations are plain SQL files applied with Wrangler. The current schema includes
the consumer workspace mapping and workspace analysis rate-limit tables:

```powershell
# Apply all pending migrations
wrangler d1 migrations apply brandcore-db

# Apply to preview environment
wrangler d1 migrations apply brandcore-db --env preview
```

## File Naming

```
0001_initial_workspace.sql
0002_facts_and_evidence.sql
0003_content_and_claims.sql
```

Sequential numeric prefix, descriptive name, `.sql` extension.

## Rules

- Every migration must be reversible or use expand → migrate → contract.
- Never run a destructive migration in the same release as the code that stops using the column.
- Test restore before any production migration (see `deployment/rollback.md`).
- Do not use SQLAlchemy or a PostgreSQL connection string. D1 is SQLite-compatible.
- All queries in the application use parameterized statements. Never concatenate untrusted values into SQL.

## Planned Entities

See `docs/ARCHITECTURE.md` §5 for the full entity list and relationships.

Migrations will be created in Milestone 2 after the POC gate passes.
