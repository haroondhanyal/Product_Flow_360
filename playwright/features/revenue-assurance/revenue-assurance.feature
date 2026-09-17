@bdd @ui @component_RevenueAssurance
Feature: Revenue assurance
  Finance and assurance teams need exact expected and actual reconciliation
  so that leakage investigations expose material differences early.

  Scenario: Review the revenue assurance board
    Given an authenticated BDD user opens the "Revenue Assurance" screen
    Then the "Revenue Assurance" screen heading is visible
    And the primary creation action is available
    And import and search controls are available for "Revenue Assurance"

  Scenario: Start a revenue reconciliation check
    Given an authenticated BDD user opens the "Revenue Assurance" screen
    When the user starts a new record on "Revenue Assurance"
    Then the common creation fields are visible for "Revenue Assurance"
    And the workflow types include "Revenue reconciliation,Leakage investigation"

  Scenario: Validate expected and actual amount controls
    Given an authenticated BDD user opens the "Revenue Assurance" screen
    When the user starts a new record on "Revenue Assurance"
    Then the module specific fields are visible for "Revenue Assurance"
    And the priority selector offers standard delivery priorities

  Scenario: Cancel an unsaved revenue check
    Given an authenticated BDD user opens the "Revenue Assurance" screen
    When the user starts a new record on "Revenue Assurance"
    And the user cancels the current BDD draft on "Revenue Assurance"
    Then the creation editor is closed for "Revenue Assurance"
    And the primary creation action is available
