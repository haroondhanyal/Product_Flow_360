@ui @evidence @regression
Feature: Evidence viewing
  Scenario: View an attached file without upload controls
    Given a delivery record has attached evidence
    When the user selects View evidence
    Then a read-only evidence window opens
    And a file can be opened in the preview window
