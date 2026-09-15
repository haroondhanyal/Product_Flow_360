# PTCL ProductFlow 360

PTCL ProductFlow 360 (PF360) is a connected delivery workspace for RFCs, requirements, tests, evidence, defects, approvals and release readiness.

## Current capabilities

| Area | Capability |
| --- | --- |
| RFC delivery | Create, search, filter, update and export change requests. |
| Lifecycle | Manage requirements, defects, UAT approvals, configuration, billing, revenue assurance and releases. |
| Test management | Create SIT, QA and UAT tests; record pass, fail, block and retest history. |
| Evidence | Attach screenshots, video and documents to RFCs, lifecycle records, tests, runs and report rows. |
| Reports | Import XLSX/CSV, manage extracted rows, attach evidence and download filtered results. |
| Appearance | Persistent PTCL Emerald, Ocean Blue, Slate, Midnight, Violet, Ruby and high-contrast themes. |

## Reports

1. Open **Reports** and upload an XLSX or CSV file (up to 50 MiB).
2. Select its worksheet, header row and status column.
3. Review report dashboard totals, execution breakdown and owner breakdown.
4. Search all extracted values, filter by status or owner, then sort by any detected column.
5. Use each row’s aligned actions to **Edit**, **Update**, **Attach evidence** or **Delete**; add rows when needed.
6. Evidence opens directly below its related row and supports upload, preview, download and deletion.
7. Download an Excel file containing the current filtered rows and their summary.

Edits update the stored extracted-data copy, summary, charts and future downloads. They do not overwrite the original spreadsheet file on the computer.

## Traceability

```text
Workspace → Project → RFC → Requirement / User Story → Test Case → Test Run → Bug → Resolution
```

Failed or blocked tests can create linked bugs, retaining the RFC, owner, priority and latest execution outcome.

## Browser-local workspace

The current web screens are browser-local. Requests, tests, report data and attachments persist in the current browser and origin using localStorage and IndexedDB.

- Clearing browser site data removes locally stored records and attachments.
- Attachments are limited to 50 MiB per file.
- Evidence supports PNG, JPG/JPEG, WebP, GIF, MP4, WebM, MOV, PDF, DOC/DOCX, XLS/XLSX, CSV, JSON, TXT and LOG.
- This is suitable for demonstrations, local validation and single-device workflows; it is not shared cloud storage.

## Run the web app

Requirements: Node.js 24 LTS and npm.

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```sh
npm run typecheck
npm run build
npm start
```

## Docker-free local API

The repository also includes a NestJS API foundation with JWT sessions, workspace memberships, RBAC and audit records. Local API data is saved in `apps/api/.data/pf360.json`; Docker and PostgreSQL are not required for local development.

```sh
cp .env.example .env
npm run migrate --workspace apps/api
npm run provision:user --workspace apps/api -- admin@example.com "PF360 Admin" "use-a-strong-password" "PTCL QA Workspace" "Super Admin"
npm run api:dev
```

The API runs at `http://localhost:4000`.

- `GET /health` checks API/local-file storage availability.
- `POST /auth/login` issues a 15-minute bearer token.
- Authenticated `/api/{entity-type}` supports project, RFC, user-story, requirement, test-case, test-run, bug, document, comment and link records.
- Roles: Super Admin, Admin, Project Manager, Product Manager, QA Lead, QA Engineer, Developer and Viewer. Viewer is read-only.

The web UI is progressively moving from browser-local storage to this API. The local JSON store is not a multi-user cloud database.

## Shared/cloud deployment

Shared team storage requires a deployment owner to supply a managed database, object storage, PTCL SSO/identity integration, production secrets, HTTPS, hosting and a network/CORS configuration. The front end must then be migrated to authenticated API calls. These infrastructure choices need organization credentials and are intentionally not assumed by this project.

## Verification

```sh
npm run api:build
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

The automated suite covers document validation/persistence, RFC-linked test execution and retests, theme persistence and responsive layout.

## Security

Use a real secret manager, HTTPS, managed object storage and a managed database before production. Do not use example environment values, browser-local data or the local JSON store for sensitive production data.

## References

- [Implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Enhancement prompt](docs/ENHANCEMENT-PROMPT.md)
- [Product description](docs/PRODUCT-DESCRIPTION.md)
