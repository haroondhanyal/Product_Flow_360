@ui @testcase @smoke
Feature: Test case management
  Scenario: Show dedicated Smoke and Regression test types
    Given the user is authenticated
    When the user opens Test Management
    Then Smoke and Regression are available as test stages
