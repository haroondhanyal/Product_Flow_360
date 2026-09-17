@bdd @ui @component_RTM
Feature: RTM delivery matrix
  The delivery team needs a controlled requirements traceability matrix
  so that every planned test case remains editable and auditable.

  Scenario: Review the RTM workspace entry controls
    Given an authenticated BDD user opens the "RTM" screen
    Then the "RTM" screen heading is visible
    And the primary creation action is available
    And import and search controls are available for "RTM"

  Scenario: Start an editable RTM with a supported case volume
    Given an authenticated BDD user opens the "RTM" screen
    When the user starts a new record on "RTM"
    Then the common creation fields are visible for "RTM"
    And the supported options include "100 test cases,200 test cases,300 test cases,500 test cases"

  Scenario: Select a larger initial RTM volume
    Given an authenticated BDD user opens the "RTM" screen
    When the user starts a new record on "RTM"
    And the user selects "200" as the RTM volume
    Then the selected RTM volume is "200"

  Scenario: Cancel an unsaved RTM draft
    Given an authenticated BDD user opens the "RTM" screen
    When the user starts a new record on "RTM"
    And the user cancels the current BDD draft on "RTM"
    Then the creation editor is closed for "RTM"
    And the primary creation action is available
