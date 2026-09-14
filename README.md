# PTCL ProductFlow 360

A connected telecom product workspace. **PF360 — from idea to impact.**

PTCL ProductFlow 360 connects projects, RFCs, user stories, tests, evidence and defects in one QA delivery workspace. Teams can assign RFCs to projects, upload and preview key documents or media, execute SIT/QA/UAT tests and trace failed runs directly into linked bugs. The current release is a browser-local prototype built for fast workflow validation.

## Project description

PTCL ProductFlow 360 is a connected product delivery workspace for managing the journey from a product idea to a verified release. It brings RFC management, user stories and requirements, test cases, evidence, defects, approvals and release readiness into one practical workflow for telecom and enterprise teams.

Each workspace can contain multiple projects, such as CRM, Billing, Fly, Digital Channels or Mobile App initiatives. RFCs can be assigned to a project and become the central point for documents, requirements, linked tests and delivery history. Teams can upload Word, PDF, Excel, CSV, image and technical files against an RFC, preview supported media, download originals and remove local copies after confirmation. The interface uses clear hierarchy, restrained colour, status badges, priority indicators, responsive tables and selectable light, dark and slate-gray themes with configurable action colours.

Test Management supports SIT, QA and UAT test cases. A case is linked to a specific RFC, can be associated with a requirement or user story through the existing Requirements workflow, and records preconditions, steps, expected outcomes, actual results and immutable retest history. Testers can attach screenshots, images, videos and supporting files to cases and individual runs. When a test fails or is blocked, the system can create a linked bug automatically. The defect retains the associated RFC, test case, priority, owner and failure evidence so that triage and retesting remain traceable.

Workspace tools provide project registration, global search, automation-result import, exports and lifecycle audit history. The current release is a browser-local prototype: saved data lives in the user’s browser and is intended for workflow demonstration and validation. A production deployment will add FastAPI, PostgreSQL, authenticated users, role-based access, secure file storage, project-level authorization and shared activity history. The goal remains simple: one dependable view of every RFC, test, issue and decision from idea to impact.

## Run

Use Node.js 24 LTS with npm.

```sh
npm install
npm run dev
```

Visit http://localhost:3000.

```sh
npm run typecheck
npm run build
npm start
```

## API and database foundation

The repository now includes a NestJS API, PostgreSQL schema migrations, JWT bearer sessions, workspace memberships, role checks and append-only audit events. Start the local database and provision the first user as follows:

```sh
cp .env.example .env
docker compose up -d postgres
npm run migrate --workspace apps/api
npm run provision:user --workspace apps/api -- admin@example.com "PF360 Admin" "use-a-strong-password" "PTCL QA Workspace" "Super Admin"
npm run api:dev
```

The API starts on `http://localhost:4000`; `GET /health` verifies PostgreSQL connectivity. `POST /auth/login` issues a 15-minute bearer token. Authenticated `/api/{entity-type}` routes support `project`, `rfc`, `user-story`, `requirement`, `test-case`, `test-run`, `bug`, `document`, `comment` and `link` records. Records are constrained to the caller’s workspace and the **Viewer** role is read-only. Use a real secret manager, HTTPS, PTCL identity integration and managed object storage before production; do not use the example database password or `.env` secrets outside local development.

## Implemented

Phase 0 audit and Phase 1 foundation: responsive Next.js dashboard, original SVG app logo, branded startup splash, local Inter font, product portfolio, request creation, search, status filters, request details and status updates, and CSV export. Demo requests persist in browser localStorage. Reloading preserves changes; clearing site storage restores samples.

### RFC documents
Open any request (newly created requests open automatically), then choose or drop documents in **RFC documents**. PDF, Word, Excel, CSV, image, JSON, TXT and LOG files are supported, up to **50 MB per file (50 × 1024 × 1024 bytes)**. Attachments support image preview, download, confirmed removal and persistent IndexedDB storage, separately from localStorage. Validation checks the extension, size, empty files and basic format signatures where applicable; it does not parse document contents or scan for malware. Browser quota failures display an error without creating a saved attachment.

### Test management
Open **Test management**, or **Manage linked test cases** from an RFC. Create a linked SIT, QA or UAT test case with an owner, priority, preconditions, steps and expected result. Review the draft, **Mark ready**, **Start test**, then save a **Passed**, **Failed** or **Blocked** result with actual-result notes and tester name. **Start retest** preserves every previous run. Failed or blocked tests can create a linked **BUG** directly; it inherits the RFC, owner, priority and latest actual result. Search and filter by RFC or status. Tests, bugs and run histories persist in localStorage.

### Projects and traceability
**Workspace tools** includes a persistent project register for named delivery spaces and keys. Every RFC Documents panel has an **RFC workspace project** selector, so the RFC and its document set can be grouped under a project or left in All Projects. Connected modules provide RFC → requirement/user story → test case → execution/evidence → linked bug traceability, plus local audit history and exports. This is a single-browser prototype: true per-project data isolation, user management, RBAC, server persistence and authorization require the planned API/database phase.

### Themes and button colours
In **Settings**, choose from eight themes: **PTCL Emerald**, **Ocean Blue**, **Slate Gray**, **Midnight**, **Violet Focus**, **Ruby Signal**, **High Contrast Light** or **High Contrast Dark**. The two high-contrast options strengthen text, borders and focus visibility. You can also select Emerald, Blue, Purple, Amber or Rose for primary buttons. Both choices apply across the workspace, forms and dialogs and are restored on reload.

### Images
RFCs accept PDF, Word, Excel, CSV, PNG, JPG/JPEG, WebP, GIF, JSON, TXT and LOG files up to 50 MB. Image attachments can be previewed in the RFC before download; run evidence additionally accepts supported video and spreadsheet formats.

Requests, tests and attachments are local to the current browser and origin. Clearing browser site data removes them. Browser storage capacity varies by device; 50 MB is the per-file limit, not a guarantee of unlimited total space.

### Verification
```sh
npm run build
npx playwright install chromium
npm test
```
Tests start a production server on port 3100. To use an existing Chrome installation instead of downloading Chromium:
```sh
PF360_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test
```
The suite covers the 50 MB boundary, rejection, persistence/download/removal, file types and storage errors, RFC-linked execution/retest history, theme and button-colour persistence, and mobile overflow.

The current web UI still uses browser-local data while the API integration is introduced incrementally. The server foundation supplies database persistence, JWT/RBAC boundaries and audit records; PTCL SSO, production secrets, HTTPS ingress, object storage and organization-specific role policy need deployment-owner inputs. Sample lifecycle counts are illustrative.

See [the phase-by-phase roadmap](docs/IMPLEMENTATION-PLAN.md) for the complete proposed Phase 0–16 approach. Frontend lives in `apps/web`; `apps/api` is reserved for the NestJS phase.

See the [refined enhancement prompt](docs/ENHANCEMENT-PROMPT.md) and the [product description](docs/PRODUCT-DESCRIPTION.md) for stakeholder-ready text.
