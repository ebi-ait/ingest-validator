# Created by amnon at 12/04/2021
Feature: file format validation
  # see ticket #266
  # (and see https://www.jetbrains.com/help/idea/handling-issues.html to make this
  #  number clickable and leading to ZenHub)

  Scenario: fastq file with matching format
    Given a file with extension fastq.gz
    And format field set to fastq.gz
    When metadata is validated
    Then All files are valid after fastq validation

  Scenario: valid fastq file with disagreeing format field

  Scenario: valid fastq file with no format

  Scenario: non fastq file called x.fastq with fastq format field
    Given non fastqu file named x.fastq
    When validation happens
    Then validation error

  Scenario: non fastq file called x.fastq with matching non fastq field
    Given non fastq file named x.fastq
    And matching non fastq format field
    When validation happens
    Then validation error - mismatch between file name and format

  Scenario: non fastq file called x.fastq with no format field
    Given non fastq file named x.fastq
    When validation happens
    Then chosen validator - fastq (according to name)
    And validation error - file contents invalid


# more scenarios
#    2)fq.gz file extension, fq.gz format
#    3)fastq file extension, fastq format
#    4)fq file extension, fq format"



Feature: a feature
  Scenario: a scenario
    Given a table step
      | file name | format field |
      | Apricot   | 5      |
      | Brocolli  | 2      |
      | Cucumber  | 10     |