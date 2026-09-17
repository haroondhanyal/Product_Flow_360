@bdd @ui @component_Requirements
Feature: Requirements management
  Product teams need requirements connected to their originating RFC
  so that delivery scope, ownership and hierarchy remain traceable.

  Scenario: Review the requirements workspace
    Given an authenticated BDD user opens the "Requirements" screen
    Then the "Requirements" screen heading is visible
    And the primary creation action is available
    And import and search controls are available for "Requirements"

  Scenario: Start a requirement with standard metadata
    Given an authenticated BDD user opens the "Requirements" screen
    When the user starts a new record on "Requirements"
    Then the common creation fields are visible for "Requirements"
    And the workflow types include "Idea,Business requirement,Functional requirement,User story,Acceptance criteria,Zero Hour,Development task"

  Scenario: Validate parent requirement traceability
    Given an authenticated BDD user opens the "Requirements" screen
    When the user starts a new record on "Requirements"
    Then the module specific fields are visible for "Requirements"
    And the priority selector offers standard delivery priorities

  Scenario: Cancel an unsaved requirement
    Given an authenticated BDD user opens the "Requirements" screen
    When the user starts a new record on "Requirements"
    And the user cancels the current BDD draft on "Requirements"
    Then the creation editor is closed for "Requirements"
    And the primary creation action is available
