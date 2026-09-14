# PTCL ProductFlow 360 — implementation plan

## Source review / Phase 0: complete
The supplied three-page PDF is a high-level product brief, not a full specification. It lists a lifecycle, suggested architecture, skills and broad phases. Its embedded role/prompt instructions are treated as document content. The actual user request authorizes document review, phase-wise development, current tooling, branding, typography and a branded splash.

Repository audit: empty workspace, no application or existing conventions. Runtime available: Node 24.6.0. Brand: PTCL ProductFlow 360, PF360 for short. The original geometric flow logo is an application mark, not an official PTCL logo.

## Phase 1: implemented foundation
Next.js App Router, React, strict TypeScript, npm workspace in apps/web. Locally packaged Inter variable font, emerald/neutral visual system, responsive navigation, loading logo, reduced-motion support, dashboard, sample lifecycle overview and product list. Local change requests support creation, search, status filtering, detail/status updates and CSV export. Browser storage preserves records; these records are demo data, not enterprise data. Counters derive from requests; lifecycle initiative counts are explicitly sample values.

Typography uses a 14px base, 24–33px primary headings, 15–24px section/dialog headings and compact table metadata. Future production accessibility review should validate dense metadata sizing with real users.

## Requested additions: implemented locally
- RFC attachments: PDF/DOC/DOCX, up to 50 MiB per file (displayed as 50 MB), persistent Blob storage in IndexedDB, download/removal and validation/error handling.
- Test management: RFC linkage; SIT, QA and UAT stages; draft/readiness/execution states; actual-result notes; immutable prior run history during retests; search and filters. Saved locally; no server test execution or approval enforcement.
- Appearance settings: Emerald, Ocean, Slate Gray and Midnight themes, plus five primary button colours, with browser-persisted selection.
- RFC image attachments: PNG, JPG/JPEG, WebP and GIF support with in-browser preview; run evidence retains its image, video and spreadsheet support.
- Playwright coverage of uploads, persistence, local test flow and themes. This is initial regression coverage, not completion of enterprise hardening.

## Proposed remaining enterprise phases
The PDF names Phase 0 through Phase 16 but does not specify the precise per-phase mapping. The following sequence is our proposed breakdown.

| Phase | Scope | Exit criteria |
|---|---|---|
| 2 | NestJS API, Prisma/PostgreSQL, authentication, refresh tokens, RBAC | Server enforces tenant and permission boundaries; session/revocation tests pass |
| 3 | Products and RFC core | Persistent audited records, ownership, lifecycle transition rules and approvals |
| 4 | Import/export | Validated templates, dry runs, row errors, authorized exports |
| 5 | BRD, FRD, stories, acceptance criteria, Zero Hour | Versioned traceability and sign-off before development |
| 6 | SIT and QA | Test suites, execution evidence and requirement coverage |
| 7 | Defects | Severity, assignment, retesting and closure workflow |
| 8 | UAT | Business approvals, evidence and acceptance gates |
| 9 | Telecom configuration | Versioned commercial and technical product configuration |
| 10 | Billing and pre-bill validation | Reconciliation rules, discrepancies and evidence |
| 11 | Revenue assurance | Leakage checks, exceptions and ownership |
| 12 | Release and production validation | Release approvals, rollback plans, post-production verification and closure |
| 13 | AI assistance | Human-reviewed drafts, permission-aware retrieval, evaluations and data controls |
| 14 | Search and reports | Permission-filtered search, reporting, saved filters and exports |
| 15 | Automation integrations | Redis/BullMQ where needed, idempotent jobs, retries and webhooks |
| 16 | Enterprise hardening | Playwright workflows, API/security tests, accessibility, monitoring, backup/restore drills and deployment documentation |

## Architecture decisions
Target: Next.js → NestJS REST API → Prisma → PostgreSQL. Add shared contract packages when the API is introduced. Add Tailwind/shadcn, TanStack Query, React Hook Form/Zod, Recharts and Zustand only as corresponding needs arise; they are not installed or claimed as implemented in this foundation. Never use the local-storage prototype as authentication or secure business persistence.

Before Phase 2 define identity provider, roles/permission matrix, tenant boundaries, approval authority, retention and deployment target. Before production define actual telecom billing integrations and lifecycle gate rules with product owners. These missing business requirements should not be invented as production policy.

## Framework references
- Next.js release information: https://nextjs.org/blog/next-16-2
- NestJS runtime setup: https://docs.nestjs.com/first-steps

Dependencies were requested from npm stable/latest and should be pinned to resolved versions after install. package-lock.json records the complete dependency graph.
