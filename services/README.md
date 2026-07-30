# Self-Hosted Operations Guide

## Stack

This Compose stack runs PostgreSQL (`acaris-db`), Redis (`acaris-redis`), auth, consultation, AI document, and API documentation. Apache on the VPS is the public TLS reverse proxy. Docker publishes auth on `8001`, consultation on `8002`, AI document on `8003`, and docs on `8004` only for the local Apache proxy.

Persistent data is kept in the Docker volume `pgdata` and the repository-local `./uploads` bind mount. Do not remove either while data must be retained. The document service has `STORAGE_TYPE=local`; uploaded documents are stored at `/app/uploads` in the container and served through `/api/document/uploads`.

## Configuration

Copy `.env.example` to `.env` and set strong values for `DB_PASSWORD`, `JWT_SECRET`, `EMAIL_PASS`, and `N8N_ACADEMIC_CALLBACK_SECRET`. Never commit `.env`.

`N8N_ACADEMIC_CALLBACK_SECRET` is a shared secret. Configure the same value in n8n and send it as the `x-academic-callback-secret` header for academic callbacks. The document and chatbot outgoing n8n requests also send this header. A missing secret intentionally prevents those webhook calls.

Review the n8n webhook URLs and public domains in `docker-compose.yml` before deployment. They are deployment-specific values, not generated automatically.

When n8n runs as a separate Docker container, attach it to the Backend Compose network so its PostgreSQL credential can resolve `acaris-db` for the PGVector retrieval tool:

```powershell
docker network connect backend-selfhosted_default n8n
```

The command is idempotent for an existing container. Run it again after recreating
the n8n container, then verify with `docker network inspect backend-selfhosted_default`.

## First Deployment

1. Build and start the stack with `docker compose up -d --build`.
2. Confirm container health and logs with `docker compose ps` and `docker compose logs --tail=100 acaris-document`.
3. The academic migrations in `migrations/` run automatically only while PostgreSQL initializes an empty `pgdata` volume.
4. Seed academic master data after the database is available:

```powershell
docker compose exec acaris-document npm run seed:curriculum
docker compose exec acaris-document npm run seed:curriculum-2020
```

The second command assigns TI-2020 or TI-2025 by student cohort. Run it after adding or changing student cohort data.

## Existing Database Deployment

The Postgres image does not rerun `/docker-entrypoint-initdb.d` files for an existing volume. Back up the database, then execute the academic migrations in this order:

```powershell
Get-Content migrations/20260729_create_academic_schema.sql | docker compose exec -T acaris-db psql -U acaris_user -d acaris_db
Get-Content migrations/20260729_add_student_curriculum_assignment.sql | docker compose exec -T acaris-db psql -U acaris_user -d acaris_db
Get-Content migrations/20260729_fix_academic_imports_and_summary.sql | docker compose exec -T acaris-db psql -U acaris_user -d acaris_db
Get-Content migrations/20260729_support_plus_minus_grades.sql | docker compose exec -T acaris-db psql -U acaris_user -d acaris_db
Get-Content migrations/20260729_limit_plus_grades_only.sql | docker compose exec -T acaris-db psql -U acaris_user -d acaris_db
Get-Content migrations/20260729_preserve_document_delete_compatibility.sql | docker compose exec -T acaris-db psql -U acaris_user -d acaris_db
```

Then run the two seed commands in the first-deployment section. To import existing extracted KHS content after assignments are present, run `docker compose exec acaris-document npm run backfill:academic` and address every reported failure before treating the import as complete.

## Routing And API

Apache must forward `/api/academic/*` to `http://127.0.0.1:8003/academic/*`; use `marslabs.conf` as the tracked template and run `apachectl configtest` before reloading Apache. Authenticated student endpoints are `/api/academic/summary`, `/courses`, and `/recommendations`. n8n-only callbacks are `/api/academic/internal/import-khs` and `/internal/import-curriculum`; they require the shared-secret header.

Static local uploads remain available at `/api/document/uploads/*`. Do not route uploads through the academic location.

## Updates And Verification

For application updates, retain `pgdata` and `./uploads`, rebuild with `docker compose up -d --build`, then inspect `docker compose logs --tail=100 acaris-document`. Validate and reload the host proxy with `apachectl configtest` followed by `systemctl reload apache2`.

Run the document-service test suite before release:

```powershell
Set-Location services/ai-document-service
npm test
```

## Backup And Recovery

Create a logical database backup with `docker compose exec -T acaris-db pg_dump -U acaris_user acaris_db > acaris_db.sql`, and back up `./uploads` separately. Restore database backups only after reviewing their target and stopping write traffic. Restore uploads to the same host directory before restarting the document service.
