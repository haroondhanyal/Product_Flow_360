# Automation Architecture

ProductFlow 360 uses an automation boundary that keeps behaviour, browser mechanics and server calls independent.

```mermaid
flowchart TD
  G[Feature files] --> SD[Step definitions]
  SD --> FL[Flows]
  FL --> PO[Page objects]
  PO --> CO[Reusable components]
  CO --> BR[Playwright browser]
  T[API tests] --> SV[Services] --> CL[Base API client] --> AR[APIRequestContext] --> BE[Backend]
```

UI and API layers share typed environment configuration, non-secret test data, utilities and reporting conventions, but UI pages never hide API calls. Preferred locators are role, label, placeholder, text, test id and finally minimal CSS. Tests are independent, avoid sleeps, and retain trace/video/screenshot evidence only on failure.
