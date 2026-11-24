# ProductFlow 360

<p align="center"><img src="apps/web/public/logo.svg" alt="ProductFlow 360 logo" width="112" /></p>

<p align="center"><strong>One workspace for product delivery, quality, evidence, and release decisions.</strong></p>

ProductFlow 360 is a PTCL delivery workspace for connecting projects, change requests, requirements, RTMs, test cases, defects, billing validation, revenue assurance, and releases. The current web experience is a **browser-local prototype**. A separate NestJS API exists for development and is **not yet the web application's shared data store**.

![ProductFlow 360 command center showing the delivery navigation, lifecycle, and requests](docs/images/command-center.png)

## At a glance

| Area | What is available now |
| --- | --- |
| Delivery | Workspace-scoped projects, RFCs, requirements, RTMs, tests, defects, approvals, billing, revenue assurance, releases, reports, and evidence. |
| Collaboration | Invite a PTCL colleague or any email address to a delivery project with a unique, seven-day acceptance link and invitation status. My Work includes role-aware review actions, a local approval audit, traceability gaps, saved RFC views, and notifications. |
| RFC intake | Import an `.eml` file into a prefilled RFC draft; review its extracted subject/body and preserved source attachment before creating the RFC. |
| AI assistant | Product and customer-support modes, local Ollama status, workspace-aware prompts, document/image context, and voice notes. |
| Uploads | RFC and evidence files up to 25 MB each; profile and workspace photos accept images up to 10 MB and are optimized in the browser. |
| Appearance | 20 workspace themes and 30 named primary-action color palettes, saved per browser. |
| Versioning | Manually set major or major.minor record versions (for example `v2` or `v1.2`), with previous and saved snapshots in the record audit history. |
| Access | Employee signup, administrator approval, login, profile, and administrator-reviewed employee password recovery in the browser prototype. Fresh demo browsers generate local-only credentials. |
| Automation | **580 functional cases** in the branded Allure report: 260 UI, 120 API, 80 database persistence, and 120 BDD. |
| Performance | **150 k6 workloads**, with a combined ProductFlow dashboard and native Grafana k6 HTML report. Latest saved run: 150/150 workloads passed and 1,500 requests recorded. |
| Stack | Next.js 16 and React 19 web app; NestJS 12 API with a local JSON development store; TypeScript automation. |

## Product journey

```mermaid
flowchart LR
  W[Workspace and project] --> R[RFC / change request]
  R --> Q[Requirement or user story]
  Q --> M[RTM mapping]
  M --> T[SIT / QA / UAT test case]
  T -->|Failed or blocked| D[Defect and evidence]
  D --> F[Fix and retest]
  F --> T
  T -->|Passed| A[UAT approval]
  A --> B[Billing validation]
  B --> V[Revenue assurance]
  V --> L[Release readiness]
  L --> P[Deployment and production verification]
```

The links between records let a delivery team follow a request from its owner and requirements through testing, financial checks, and release. When raising an RFC, select the PTCL product, department, customer segment, delivery project, owner, and due date as separate fields. Product options include Flash Fiber, Enterprise, Smart TV, Voice, CRM, CBS, BI, Maximo / Meximo, One Window, Prisma, E-Ocean, Website, UPTCL App, and EVAM. Department choices include CVM, PD Devices, Product Development, IPTV, Digital, CRM, CBS, IT Planning, Revenue Assurance, Contact Center, BI Data Analyst, and PTCL's other grouped teams. Attach up to 10 PDF, Word, PowerPoint, Excel, image, or supporting files at 25 MB each. Open an RFC to review or download its attachments and continue the linked delivery workflow. The UI also provides search, filtering, import or export where supported, and an audit-oriented activity view.

Lifecycle records can be assigned a manual version using a whole number or major.minor value from 1 through 100 per part (for example `v2`, `v1.2`, or `v2.3`). Every saved change keeps a before/after snapshot in that record's history. Evidence opens in a centered viewer with its own scroll area; the underlying workspace stays fixed until the viewer closes.

## Key screens

| Screen | Main work |
| --- | --- |
| Command Center | Portfolio overview, request pipeline, metrics, alerts, and saved project RTMs with a direct open action. |
| Workspaces and products | Select a workspace, register projects, and browse a workspace-scoped product portfolio. |
| Change requests | Create and manage RFCs with product, department, segment, delivery project, status, owner, priority, due date, documents, and linked delivery work. Import `.eml` files into drafts, save named filters, and open an RFC to review or download its attached files. |
| My Work | Workspace-scoped assigned items, employee review inbox, manager/admin review queue, decisions, local audit trail, and RFC requirement/test coverage gaps. |
| Project teams | Invite a directory colleague or email address, copy a unique URL or review/send the email draft, then accept or decline from the invited account. |
| Requirements and RTM | Capture requirements, create or import matrices, and connect requirements to test coverage. |
| Test Management and Defects | Define cases, execute or retest, record outcomes, view or download evidence, and triage issues. |
| UAT, billing, revenue, and releases | Review approval and validation records, then check release readiness. |
| AI Assistant | Ask the local Product Copilot about delivery work, attach supported files, or switch to customer-support mode. |
| Admin Board | Review employee signups, roles, departments, and employee password reset requests. |

### Screen-by-screen screenshots

The screenshots below were recaptured from the current production build in a clean Chromium browser on 24 November 2026. The gallery reflects the current responsive header and request list, workspace-scoped flow, lifecycle status controls, project invitation UI, My Work review inbox, and local AI assistant. The Command Center lists saved RTMs with their workspace and case count; **Open RTM** selects that matrix in the existing editor so its rows and evidence flow continue there. A first-time browser gets a demo portfolio with 30 change requests, 30 records in each lifecycle board, 30 test cases, a 30-row RTM, and 30 delivery projects. Existing browser data is preserved. The gallery includes every workspace screen plus mobile navigation, mobile change-request cards, project invitation, local assistant, login, signup, and password recovery. Login screenshots contain no password.

| Login | Sign up | Password recovery | Command Center |
| --- | --- | --- | --- |
| <img src="docs/images/screens/00-login.png" alt="Login screen" width="240"> | <img src="docs/images/screens/00-sign-up.png" alt="Signup screen" width="240"> | <img src="docs/images/screens/00-password-recovery.png" alt="Password recovery screen" width="240"> | <img src="docs/images/screens/01-command-center.png" alt="Command Center screen" width="240"> |

| Products | Change requests | Requirements | Test management |
| --- | --- | --- | --- |
| <img src="docs/images/screens/02-products.png" alt="Products screen" width="240"> | <img src="docs/images/screens/03-change-requests.png" alt="Change requests screen" width="240"> | <img src="docs/images/screens/04-requirements.png" alt="Requirements screen" width="240"> | <img src="docs/images/screens/05-test-management.png" alt="Test management screen" width="240"> |

| Defects | RTM | UAT approvals | Telecom configuration |
| --- | --- | --- | --- |
| <img src="docs/images/screens/06-defects.png" alt="Defects screen" width="240"> | <img src="docs/images/screens/07-rtm.png" alt="RTM screen" width="240"> | <img src="docs/images/screens/08-uat-approvals.png" alt="UAT approvals screen" width="240"> | <img src="docs/images/screens/09-telecom-configuration.png" alt="Telecom configuration screen" width="240"> |

| Billing validation | Revenue assurance | Releases | Reports |
| --- | --- | --- | --- |
| <img src="docs/images/screens/10-billing-validation.png" alt="Billing validation screen" width="240"> | <img src="docs/images/screens/11-revenue-assurance.png" alt="Revenue assurance screen" width="240"> | <img src="docs/images/screens/12-releases.png" alt="Releases screen" width="240"> | <img src="docs/images/screens/13-reports.png" alt="Reports screen" width="240"> |

| Workspace tools | Settings | Admin board | Help & resources |
| --- | --- | --- | --- |
| <img src="docs/images/screens/14-workspace-tools.png" alt="Workspace tools screen" width="240"> | <img src="docs/images/screens/15-settings.png" alt="Settings screen" width="240"> | <img src="docs/images/screens/16-admin-board.png" alt="Admin board screen" width="240"> | <img src="docs/images/screens/17-help-resources.png" alt="Help and resources screen" width="240"> |

| Mobile overview | Mobile navigation | Project invitation | AI Assistant |
| --- | --- | --- | --- |
| <img src="docs/images/screens/18-mobile-overview.png" alt="Responsive ProductFlow overview on a mobile screen" width="240"> | <img src="docs/images/screens/19-mobile-navigation.png" alt="Responsive mobile workspace navigation drawer" width="240"> | <img src="docs/images/screens/20-project-invitation.png" alt="Project team invitation with selected colleague email" width="240"> | <img src="docs/images/screens/21-ai-assistant.png" alt="ProductFlow local AI Assistant dialog" width="240"> |

| Mobile change requests |
| --- |
| <img src="docs/images/screens/28-mobile-change-requests.png" alt="Mobile change request cards with separate status, priority, owner, and due date rows" width="240"> |

| My Work |
| --- |
| <img src="docs/images/screens/29-my-work.png" alt="My Work page with assigned delivery records and review actions" width="640"> |

| Tablet header |
| --- |
| <img src="docs/images/screens/26-tablet-header.png" alt="Tablet header with workspace selector on its own row without overlapping navigation or actions" width="480"> |

| Lifecycle form |
| --- |
| <img src="docs/images/screens/27-billing-form.png" alt="Billing validation form with aligned fields and spaced save action" width="480"> |

| Overview editor | Lifecycle status menu | New request form | Priority menu |
| --- | --- | --- | --- |
| <img src="docs/images/screens/22-overview-editor.png" alt="Overview editor with icon-based priority and status controls" width="240"> | <img src="docs/images/screens/23-lifecycle-status-options.png" alt="Modern lifecycle status options with related icons" width="240"> | <img src="docs/images/screens/24-new-request-form.png" alt="New delivery request form with workspace project selector" width="240"> | <img src="docs/images/screens/25-priority-options.png" alt="Priority options with severity icons" width="240"> |

To capture the gallery again, start the web app at `http://127.0.0.1:3100`, then run `npm run screenshots` from the repository root. The screenshot runner seeds an isolated browser with the local demo administrator and writes no browser account data to the repository. Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` to use a separately provisioned local account.

### Employee access flow

```mermaid
flowchart LR
  S[Employee signup] --> P[Pending account]
  P --> A{Admin review}
  A -->|Approve| L[Employee login]
  A -->|Reject| X[Access denied]
  L --> F[Forgot password request]
  F --> R{Admin review}
  R -->|Approve and share code| C[Employee enters code and new password]
  R -->|Reject| X
  C --> L
```

![ProductFlow 360 login screen with signup and password recovery entry points](docs/images/login.png)

The browser prototype stores account records and recovery state locally. The administrator must share an approved recovery code with a verified employee through an appropriate channel. This workflow is suitable for demonstration and test automation, not production identity assurance.

## Architecture and data boundaries

```mermaid
flowchart TB
  subgraph Browser[Current web prototype]
    UI[Next.js UI] --> Domain[Client domain logic]
    Domain --> LS[localStorage: records, settings, accounts]
    Domain --> IDB[IndexedDB: documents and blobs]
  end
  subgraph APISide[Separate development API]
    API[NestJS REST API] --> Auth[JWT and workspace role guard]
    Auth --> Store[Local JSON store]
  end
  Tests[Playwright and Cucumber] --> UI
  Tests -. optional API checks .-> API
  UI -. future integration .-> API
```

The API provides JWT login, workspace-scoped entities, dashboard endpoints, and audit writes. The web UI currently uses browser persistence; starting the API does not make web data shared across browsers. The API's active store is `apps/api/.data/pf360.json`. Prisma and PostgreSQL packages are present for future work, but the current API reads and writes the local JSON store. RFC `.eml` intake is a user-uploaded file flow; automatic mailbox ingestion and shared server persistence still require a provisioned data service and mailbox/provider credentials.

### Repository map

| Path | Purpose |
| --- | --- |
| `apps/web/app`, `apps/web/components`, `apps/web/lib` | Next.js shell, product UI, browser-local workflows and persistence. |
| `apps/web/public/logo.svg` | ProductFlow 360 brand mark. |
| `apps/api/src` | NestJS endpoints, JWT authorization, dashboard aggregation, local store. |
| `playwright/tests/ui` | Playwright browser tests. |
| `playwright/features`, `playwright/step-definitions` | Executable Cucumber BDD scenarios and steps. |
| `playwright/src/ui/locators`, `playwright/src/ui/pages` | Screen selectors and page objects. |
| `playwright/performance` | 150 workload definitions, k6 runner script, and combined report dashboard template. |
| `playwright/scripts` | Allure, API, BDD, and k6 runners/report generation. |
| `docs/images/automation-report-snapshots` | Latest captured Allure, combined k6, and native k6 report screenshots. |
| `docs` | Product notes, implementation status, and documentation images. |

## Run locally

Requirements: Node.js 24 and npm. From the repository root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A fresh browser seeds the local-only demo administrator and synthetic department accounts. The Admin Board exports the account list to the ignored `PF360-demo-accounts.txt` file, including short department-based `.example` emails and active status. Demo credentials are shared only by these fictional local accounts; they must never be used for production identity management. Credentials stay in that browser and are not shared across devices.

### Local Product Copilot

The Product Copilot can connect to a local Ollama installation. By default it checks `http://127.0.0.1:11434` and uses `lfm3-omni:latest`; set `OLLAMA_BASE_URL` and `OLLAMA_MODEL` to select another local endpoint or installed model. Start Ollama and pull the selected model before using chat, document extraction, image context, or voice transcription. The default local setup needs no hosted AI API key. Availability depends on the local machine and installed Ollama models.

To run the separate development API, copy `.env.example` to `.env`, then provision a user and start the service:

```bash
cp .env.example .env
npm run migrate --workspace apps/api
npm run provision:user --workspace apps/api -- admin@example.com "PF360 Admin" "use-a-strong-password" "PTCL QA Workspace" "Super Admin"
npm run api:dev
```

`GET /health` reports API and local-store health. Authenticated endpoints include `POST /auth/login`, workspace-scoped `/api/:type` records, and `/dashboard/*` statistics. API data is separate from browser-local UI data.

## Quality and reports

```mermaid
flowchart LR
  UI[260 UI cases] --> Allure[Branded 580-case Allure report]
  API[120 API cases] --> Allure
  DB[80 database cases] --> Allure
  BDD[120 BDD cases] --> Allure
  Allure --> K6[150 k6 workloads]
  K6 --> Combined[Combined 730-case performance dashboard]
  K6 --> Native[Native Grafana k6 HTML report]
```

### Latest report screenshots

The screenshots below show the generated reports. The functional Allure run has four top-level sections. The k6 dashboard joins those 580 functional results with 150 performance workloads; the native k6 export shows the time-series view from the same run.

#### Allure: 580 functional cases

![ProductFlow 360 branded Allure report showing 580 test cases across UI, BDD, API, and database suites](docs/images/automation-report-snapshots/allure-latest.png)

#### Combined performance: 730 functional and k6 cases

![ProductFlow 360 combined performance dashboard showing 650 cases, latest pass totals, and workload latency](docs/images/automation-report-snapshots/k6-performance-latest.png)

#### Native Grafana k6 report

![Native Grafana k6 web dashboard export showing request rate, request duration, virtual users, and transfer rate](docs/images/automation-report-snapshots/native-k6-latest.png)

### What the 580 functional cases cover

| Allure section | Count | Coverage |
| --- | ---: | --- |
| **UI Automation** | **260** | Chromium UI navigation, module availability, record forms, field and selector contracts, cancel/draft recovery, search and empty states, and workflow interactions. Includes smoke, regression, and negative search coverage across the workspace, RTM, test management, defects, requirements, billing validation, revenue assurance, releases, settings, and related screens. |
| **APIs Automation** | **120** | API health/readiness; login input validation and credential cases; success/token contracts; missing, malformed, or invalid authorization; protected resource checks; entity create/read workflows; and dashboard endpoint access. The runner creates an isolated temporary API store and test account for the API suite. |
| **Database Validation** | **80** | Persisted writes, workspace-scoped reads, updates, audit rows, rejected invalid writes, workspace isolation, store integrity, and user/workspace membership checks. These exercise the API's isolated local JSON store; they are not live PostgreSQL tests. Every case includes screenshot and video evidence in Allure. |
| **BDD Cases** | **120** | Gherkin-driven delivery board visibility, creation form fields, draft cancellation, unmatched searches, and supported workflow options across Defects, Requirements, Revenue Assurance, Test Management, and RTM. This includes the original component feature scenarios and the expanded BDD case catalogue. |
| **Total** | **580** | One branded Allure report with UI Automation, APIs Automation, Database Validation, and BDD Cases suites. |

The 260 UI cases include the original UI coverage plus 45 navigation smoke checks, 62 regression checks for forms and board controls, and 70 negative unmatched-search checks. Allure groups tests by suite/component and includes the evidence produced by each layer: browser screenshots/videos for UI, BDD, API, and database flows, plus request/response and persisted-row evidence for API and database checks.

### What the 150 k6 workloads cover

The k6 suite targets the local ProductFlow 360 workspace page, the JavaScript bundle discovered from that page, and the ProductFlow logo asset. Its 150 uniquely named cases cross three target resources with 10 workload focuses and five request profiles:

| Dimension | Breakdown |
| --- | --- |
| Workload focuses | Smoke: cold and warm response, content type; Regression: repeated navigation, body integrity, latency budget; Capacity baseline: one-VU baseline, steady request handling, availability; Resilience: short-interval availability. |
| Request profiles | Standard request, browser Accept headers, no-cache headers, English locale header, and cache-bypass query. |
| Targets | Workspace HTML (`/`), its discovered JavaScript bundle, and `/logo.svg`. |
| Default execution | 10 requests per case, one virtual user: 1,500 total HTTP requests in the latest saved run. |
| Checks | HTTP 200, expected response content type, non-empty response body, and per-route latency budget. k6 thresholds also check failed-request rate, overall p95 latency, and check pass rate. |

The default profile is a low-load local baseline, not a production capacity claim. Configure it with `PF360_K6_REPEATS`, `PF360_K6_VUS`, `PF360_K6_MAX_DURATION`, `PF360_PERF_BASE_URL`, and `K6_BIN` as needed. The combined dashboard provides latency comparisons, workload search and details, six visual modes, and CSV/JSON/raw-metric downloads. The native export is generated by k6's [web dashboard output](https://grafana.com/docs/k6/latest/results-output/web-dashboard/).

Latest functional run (6 October 2026): Allure **580/580 passed** (260 UI, 120 API, 80 database, 120 BDD). Latest k6 run (6 October 2026): **150/150 passed**, **1,500 requests**, overall request p95 **4.07 ms**. These timing values describe that local run and depend on the host and app build.

### Generate the reports

Install the browser and Grafana k6 (for example `brew install k6` on macOS). Start the web app on port 3100 in one terminal:

```bash
npx playwright install chromium
npm run dev --workspace apps/web -- --hostname 127.0.0.1 --port 3100
```

Then generate both report sets from the repository root, in order:

```bash
npm run test:allure
npm run test:k6
```

The Allure runner generates the 580 functional results. The k6 runner consumes that Allure data and creates its 150 workload results and native HTML export. **Run k6 after Allure:** Allure report generation cleans the output folder and can remove existing performance files. To refresh only the report from current Allure results, use `npm run report:allure`, then run `npm run test:k6` again to restore the combined performance files.

Open the reports in Chrome:

| Report | URL |
| --- | --- |
| Branded Allure report | <http://127.0.0.1:3100/reports/allure/index.html> |
| Combined performance dashboard | <http://127.0.0.1:3100/reports/allure/performance/index.html> |
| Native k6 HTML report | <http://127.0.0.1:3100/reports/allure/performance/native-k6-report.html> |

Generated reports live under `playwright/reports/allure` and are ignored by Git; the committed README screenshots above are static snapshots of the latest saved run. See the [detailed automation guide](playwright/README.md) and [automation architecture](playwright/docs/AUTOMATION_ARCHITECTURE.md) for suite structure and configuration.

## Current limits and next steps

Browser storage is device-local and clearing site data removes local records. Workspace selection filters browser records but is not a server-side access boundary. Project invitations are stored in the Next.js app server's local `.data/project-invitations.json` file; invite links expire after seven days and the invited account email must match to respond. The app creates a `mailto:` draft and copyable link, but the sender must send the email. On acceptance, project and workspace metadata are added to the recipient browser; project requests, documents, and other records are not synchronized between browsers. This local JSON invitation store is not shared across server instances or suitable for production durability. Authentication and password recovery are also not server-backed, so the current email check is demo-level identity matching, not production authorization. Production work includes connecting the UI to the API, managed database and file storage, organization identity, server-side access enforcement, shared invitations and email delivery, backups, monitoring, and real billing integrations. The [implementation plan](docs/IMPLEMENTATION-PLAN.md) distinguishes current behavior from the target architecture.

## Further reading

- [Product description](docs/PRODUCT-DESCRIPTION.md)
- [Implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Automation architecture](playwright/docs/AUTOMATION_ARCHITECTURE.md)
