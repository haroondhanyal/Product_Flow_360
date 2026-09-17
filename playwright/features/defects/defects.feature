@bdd @ui @component_Defects
Feature: Defect management
  Quality teams need consistent defect triage fields and traceability
  so that failures can move safely from discovery to closure.

  Scenario: Review the defect board controls
    Given an authenticated BDD user opens the "Defects" screen
    Then the "Defects" screen heading is visible
    And the primary creation action is available
    And import and search controls are available for "Defects"

  Scenario: Start a defect with accountable ownership
    Given an authenticated BDD user opens the "Defects" screen
    When the user starts a new record on "Defects"
    Then the common creation fields are visible for "Defects"
    And the workflow types include "Functional,Billing,Performance,Integration,UI"

  Scenario: Validate defect triage and linked test controls
    Given an authenticated BDD user opens the "Defects" screen
    When the user starts a new record on "Defects"
    Then the module specific fields are visible for "Defects"
    And the priority selector offers standard delivery priorities

  Scenario: Cancel an unsaved defect without changing the board
    Given an authenticated BDD user opens the "Defects" screen
    When the user starts a new record on "Defects"
    And the user cancels the current BDD draft on "Defects"
    Then the creation editor is closed for "Defects"
    And the primary creation action is available
