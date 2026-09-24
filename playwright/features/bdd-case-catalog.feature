@bdd @ui @regression
Feature: ProductFlow 360 cross-module BDD case catalog
  Business readable workflows validate key delivery screens, forms, empty states and workflow options.

  Scenario Outline: PF360-BDD-<id> opens the <screen> delivery board
    Given an authenticated BDD user opens the "<screen>" screen
    Then the "<screen>" screen heading is visible
    And the creation action is available on "<screen>"

    Examples:
      | id | screen |
      | 021 | Defects |
      | 022 | Defects |
      | 023 | Defects |
      | 024 | Defects |
      | 025 | Requirements |
      | 026 | Requirements |
      | 027 | Requirements |
      | 028 | Requirements |
      | 029 | Revenue Assurance |
      | 030 | Revenue Assurance |
      | 031 | Revenue Assurance |
      | 032 | Revenue Assurance |
      | 033 | Test Management |
      | 034 | Test Management |
      | 035 | Test Management |
      | 036 | Test Management |
      | 037 | RTM |
      | 038 | RTM |
      | 039 | RTM |
      | 040 | RTM |
  Scenario Outline: PF360-BDD-<id> validates the <screen> creation form
    Given an authenticated BDD user opens the "<screen>" screen
    When the user starts a new record on "<screen>"
    Then the common creation fields are visible for "<screen>"

    Examples:
      | id | screen |
      | 041 | Defects |
      | 042 | Defects |
      | 043 | Defects |
      | 044 | Defects |
      | 045 | Requirements |
      | 046 | Requirements |
      | 047 | Requirements |
      | 048 | Requirements |
      | 049 | Revenue Assurance |
      | 050 | Revenue Assurance |
      | 051 | Revenue Assurance |
      | 052 | Revenue Assurance |
      | 053 | Test Management |
      | 054 | Test Management |
      | 055 | Test Management |
      | 056 | Test Management |
      | 057 | RTM |
      | 058 | RTM |
      | 059 | RTM |
      | 060 | RTM |
  Scenario Outline: PF360-BDD-<id> safely cancels a <screen> draft
    Given an authenticated BDD user opens the "<screen>" screen
    When the user starts a new record on "<screen>"
    And the user cancels the current BDD draft on "<screen>"
    Then the creation editor is closed for "<screen>"

    Examples:
      | id | screen |
      | 061 | Defects |
      | 062 | Defects |
      | 063 | Defects |
      | 064 | Defects |
      | 065 | Requirements |
      | 066 | Requirements |
      | 067 | Requirements |
      | 068 | Requirements |
      | 069 | Revenue Assurance |
      | 070 | Revenue Assurance |
      | 071 | Revenue Assurance |
      | 072 | Revenue Assurance |
      | 073 | Test Management |
      | 074 | Test Management |
      | 075 | Test Management |
      | 076 | Test Management |
      | 077 | RTM |
      | 078 | RTM |
      | 079 | RTM |
      | 080 | RTM |
  Scenario Outline: PF360-BDD-<id> keeps unmatched <screen> searches empty
    Given an authenticated BDD user opens the "<screen>" screen
    When the user searches "PF360_BDD_NO_MATCH_<id>_<screen>" on "<screen>"
    Then the "<screen>" search result list is empty

    Examples:
      | id | screen |
      | 081 | Defects |
      | 082 | Defects |
      | 083 | Defects |
      | 084 | Defects |
      | 085 | Requirements |
      | 086 | Requirements |
      | 087 | Requirements |
      | 088 | Requirements |
      | 089 | Revenue Assurance |
      | 090 | Revenue Assurance |
      | 091 | Revenue Assurance |
      | 092 | Revenue Assurance |
      | 093 | Billing Validation |
      | 094 | Billing Validation |
      | 095 | Billing Validation |
      | 096 | Billing Validation |
      | 097 | Releases |
      | 098 | Releases |
      | 099 | Releases |
      | 100 | Releases |
  Scenario Outline: PF360-BDD-<id> exposes the supported <screen> workflow options
    Given an authenticated BDD user opens the "<screen>" screen
    When the user starts a new record on "<screen>"
    Then the workflow options for "<screen>" include "<options>"

    Examples:
      | id | screen | options |
      | 101 | Defects | Functional,Billing,Performance,Integration,UI |
      | 102 | Defects | Functional,Billing,Performance,Integration,UI |
      | 103 | Defects | Functional,Billing,Performance,Integration,UI |
      | 104 | Defects | Functional,Billing,Performance,Integration,UI |
      | 105 | Requirements | Idea,Business requirement,Functional requirement,User story,Acceptance criteria,Zero Hour,Development task |
      | 106 | Requirements | Idea,Business requirement,Functional requirement,User story,Acceptance criteria,Zero Hour,Development task |
      | 107 | Requirements | Idea,Business requirement,Functional requirement,User story,Acceptance criteria,Zero Hour,Development task |
      | 108 | Requirements | Idea,Business requirement,Functional requirement,User story,Acceptance criteria,Zero Hour,Development task |
      | 109 | Revenue Assurance | Revenue reconciliation,Leakage investigation |
      | 110 | Revenue Assurance | Revenue reconciliation,Leakage investigation |
      | 111 | Revenue Assurance | Revenue reconciliation,Leakage investigation |
      | 112 | Revenue Assurance | Revenue reconciliation,Leakage investigation |
      | 113 | Test Management | Smoke,Regression,SIT,QA,UAT |
      | 114 | Test Management | Smoke,Regression,SIT,QA,UAT |
      | 115 | Test Management | Smoke,Regression,SIT,QA,UAT |
      | 116 | Test Management | Smoke,Regression,SIT,QA,UAT |
      | 117 | Billing Validation | Billing validation,Pre-bill validation |
      | 118 | Billing Validation | Billing validation,Pre-bill validation |
      | 119 | Billing Validation | Billing validation,Pre-bill validation |
      | 120 | Billing Validation | Billing validation,Pre-bill validation |
