# PTCL ProductFlow 360

A connected telecom product workspace. **PF360 — from idea to impact.**

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

## Implemented

Phase 0 audit and Phase 1 foundation: responsive Next.js dashboard, original SVG app logo, branded startup splash, local Inter font, product portfolio, request creation, search, status filters, request details and status updates, and CSV export. Demo requests persist in browser localStorage. Reloading preserves changes; clearing site storage restores samples.

### RFC documents
Open any request (newly created requests open automatically), then choose or drop documents in **RFC documents**. PDF, Word, Excel, CSV, image, JSON, TXT and LOG files are supported, up to **50 MB per file (50 × 1024 × 1024 bytes)**. Attachments support image preview, download, confirmed removal and persistent IndexedDB storage, separately from localStorage. Validation checks the extension, size, empty files and basic format signatures where applicable; it does not parse document contents or scan for malware. Browser quota failures display an error without creating a saved attachment.

### Test management
Open **Test management**, or **Manage linked test cases** from an RFC. Create a linked SIT, QA or UAT test case with an owner, priority, preconditions, steps and expected result. Review the draft, **Mark ready**, **Start test**, then save a **Passed**, **Failed** or **Blocked** result with actual-result notes and tester name. **Start retest** preserves every previous run. Failed or blocked tests can create a linked **BUG** directly; it inherits the RFC, owner, priority and latest actual result. Search and filter by RFC or status. Tests, bugs and run histories persist in localStorage.

### Projects and traceability
**Workspace tools** includes a persistent project register for named delivery spaces and keys. Connected modules provide RFC → requirement/user story → test case → execution/evidence → linked bug traceability, plus local audit history and exports. This is a single-browser prototype: true per-project data isolation, user management, RBAC, server persistence and authorization require the planned API/database phase.

### Themes and button colours
In **Settings**, choose **PTCL Emerald**, **Ocean Blue**, **Slate Gray** or **Midnight**. You can also select Emerald, Blue, Purple, Amber or Rose for primary buttons. Both choices apply across the workspace, forms and dialogs and are restored on reload.

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

Other module links visibly identify planned functionality. Authentication, backend API, database, approval enforcement and enterprise integrations are not implemented. Sample lifecycle counts are illustrative.

See [the phase-by-phase roadmap](docs/IMPLEMENTATION-PLAN.md) for the complete proposed Phase 0–16 approach. Frontend lives in `apps/web`; `apps/api` is reserved for the NestJS phase.
