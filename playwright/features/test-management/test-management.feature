@bdd @ui @component_TestManagement
Feature: Test management
  Test engineers need complete test definitions linked to an RFC
  so that Smoke and Regression coverage can be governed consistently.

  Scenario: Review the test management board
    Given an authenticated BDD user opens the "Test Management" screen
    Then the "Test Management" screen heading is visible
    And the primary creation action is available
    And import and search controls are available for "Test Management"

  Scenario: Start a test case linked to delivery work
    Given an authenticated BDD user opens the "Test Management" screen
    When the user starts a new record on "Test Management"
    Then the common creation fields are visible for "Test Management"
    And the supported options include "Smoke,Regression,SIT,QA,UAT"

  Scenario: Validate execution definition fields
    Given an authenticated BDD user opens the "Test Management" screen
    When the user starts a new record on "Test Management"
    Then the module specific fields are visible for "Test Management"
    And the linked RFC selector contains delivery requests

  Scenario: Cancel an incomplete test case
    Given an authenticated BDD user opens the "Test Management" screen
    When the user starts a new record on "Test Management"
    And the user cancels the current BDD draft on "Test Management"
    Then the creation editor is closed for "Test Management"
    And the primary creation action is available
