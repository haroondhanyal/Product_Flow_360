# ProductFlow 360 Automation Architecture

This document describes the executable browser and API automation, its functional coverage, evidence flow, and Allure model. The verified Chromium baseline is **83 Playwright UI cases plus 20 Cucumber scenarios: 103 passed**.

## Layered design

```mermaid
flowchart TD
  subgraph Business[Business-readable layer]
    Features[Gherkin feature files]
    Specs[Playwright specs]
  end
  subgraph Actions[Interaction layer]
    Steps[Cucumber step definitions]
    Pages[Screen page objects]
    Components[Reusable sidebar and controls]
  end
  subgraph Selectors[Selector layer]
    Hub[Locator hub]
    ScreenLocators[One locator file per screen]
  end
  subgraph Runtime[Runtime and evidence]
    World[Cucumber World and hooks]
    Browser[Playwright Chromium]
    App[ProductFlow 360 web app]
    Evidence[Screenshots, videos, traces]
  end
  Features --> Steps --> Pages
  Specs --> Pages
  Pages --> Components
  Pages --> Hub --> ScreenLocators
  Steps --> World --> Browser
  Specs --> Browser --> App
  Browser --> Evidence
```

Specs and Gherkin steps express assertions. Page objects expose screen actions. Locator files own selectors. Cucumber World owns scenario browser lifecycle and attachments. This keeps changes to UI wording or roles localized to a screen's locator and page object.

## Functional coverage map

```mermaid
flowchart LR
  Auth[Authentication] --> Signup[Signup and admin approval]
  Auth --> Recovery[Forgot password and admin review]
  Workspace[Workspace] --> Products[Products]
  Products --> RFC[Change requests]
  RFC --> Requirements[Requirements]
  Requirements --> RTM[RTM]
  RTM --> Tests[Test Management]
  Tests --> Defects[Defects]
  Tests --> UAT[UAT approval]
  UAT --> Billing[Billing validation]
  Billing --> Revenue[Revenue assurance]
  Revenue --> Release[Releases]

  classDef bdd fill:#e7f7ef,stroke:#087c59,color:#173f52;
  class RTM,Tests,Defects,Requirements,Revenue bdd;
```

The green modules have four executable BDD scenarios each in addition to Playwright coverage. Playwright suites cover the wider product, including settings, workspace, products, change requests, billing, releases, signup, recovery, smoke, and end-to-end creation.

| Coverage source | Count | Scope |
| --- | ---: | --- |
| Playwright UI | 83 | Component checks, positive and negative paths, access flows, lifecycle boards, smoke, and record creation. |
| Cucumber BDD | 20 | Four scenarios each for RTM, Defects, Test Management, Requirements, and Revenue Assurance. |
| API tests | 2 | Health success and unknown-route negative path; enabled only when the API runs. |

## Browser test lifecycle

```mermaid
sequenceDiagram
  participant R as Test runner
  participant S as Local Next server
  participant B as Chromium context
  participant P as Page object
  participant A as Assertion
  participant E as Allure
  R->>S: Start ProductFlow 360 on port 3100
  R->>B: Create isolated browser context
  B->>P: Login and open target screen
  P->>A: Perform action and expose locator
  A-->>R: Pass or fail with details
  B->>E: Attach screenshot and video
  R->>E: Add suite, component, owner, and environment labels
  R->>S: Stop local server
```

Every test starts from an independent login or setup path. Playwright runs with four workers. Cucumber runs sequentially because its TypeScript runtime and hooks share the main process configuration. Assertions use Playwright's auto-waiting matchers; fixed sleeps are avoided.

## BDD execution flow

```mermaid
sequenceDiagram
  participant F as Feature scenario
  participant SD as component.steps.ts
  participant W as BddWorld
  participant L as Locator hub
  participant UI as ProductFlow UI
  F->>W: Before hook creates context with video
  F->>SD: Given authenticated user opens screen
  SD->>UI: Login and navigate through sidebar
  F->>SD: When user starts or changes a record
  SD->>L: Resolve screen locator
  L-->>SD: Role, label, or test-id locator
  SD->>UI: Interact and assert expected state
  W->>W: After hook captures full-page screenshot
  W->>W: Close context and attach WebM video
```

Feature files live under `playwright/features/<component>`. The active Cucumber configuration includes the five maintained BDD feature folders and all 20 scenarios are executable.

## Locator ownership

```mermaid
flowchart TB
  Test[Test or step] --> Page[Page object]
  Page --> Locator[Screen locator module]
  Locator --> Role[Role and accessible name]
  Locator --> Label[Label or placeholder]
  Locator --> TestId[data-testid]
  Locator -. legacy only .-> XPath[Isolated XPath fallback]
```

Preferred selector order is role and accessible name, label, placeholder, text, test id, then minimal CSS. XPath fallbacks remain isolated in `xpath-fallbacks.ts`. Tests should never scatter raw selectors when a screen locator module can own them.

## Combined Allure pipeline

```mermaid
flowchart TD
  Command[npm run test:allure] --> Reset[Preserve history and reset results]
  Reset --> Server[Start local Next server]
  Server --> Cucumber[Run 20 Cucumber scenarios]
  Cucumber --> Shared[(playwright/allure-results)]
  Server --> PW[Run 83 Chromium Playwright cases]
  PW --> Shared
  Shared --> Enrich[Add suites, packages, categories, executor, environment, and branding]
  Enrich --> Generate[Generate static Allure report]
  Generate --> BDD[Top suite: BDD Cases]
  Generate --> Native[Top suite: Playwright Cases]
  Generate --> Trend[Overview, history, trend, categories, executors]
```

The report generator identifies Cucumber results through the `cucumberjs` framework label. A `@component_*` tag provides the exact BDD component suite. Playwright results are grouped under **Playwright Cases** and classified by module or flow. Generated reports, raw results, videos, and saved report history are ignored by Git.

## API boundary

```mermaid
flowchart LR
  APIFile[tests/api] --> Service[API service]
  Service --> Client[BaseApiClient / APIRequestContext]
  Client --> Health[Running NestJS API]
```

API tests use `PF360_RUN_API_TESTS=1` as an explicit availability gate. This prevents a browser-only run from reporting infrastructure failures when the separate API has not been started. API endpoint paths belong in services and clients, not UI page objects.

## Directory responsibilities

| Path | Responsibility |
| --- | --- |
| `config/environment.ts` | Base URLs and credentials supplied through environment variables. |
| `features` | Executable business scenarios. |
| `step-definitions` | Thin Gherkin-to-browser mappings. |
| `support/bdd-world.ts` | Per-scenario browser, screenshot, and video lifecycle. |
| `src/ui/locators` | Central screen selector modules. |
| `src/ui/pages`, `src/ui/components` | Reusable screen actions and navigation. |
| `src/api` | API clients and services. |
| `tests/ui`, `tests/api` | Playwright cases and assertions. |
| `scripts` | Result reset, combined execution, and branded Allure generation. |
| `reports`, `artifacts`, `allure-results` | Generated local output; not source controlled. |

## Extension rules

1. Add or update the screen locator module.
2. Put reusable interactions in a page object or component.
3. Keep assertions in a Playwright spec or Cucumber step.
4. Give each test independent setup and identifiable generated data.
5. Add BDD only for flows that benefit from business-readable behavior.
6. Run the focused spec first, then `npm run test:allure` when report integration changes.
