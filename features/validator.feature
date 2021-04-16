# Created by amnon at 12/04/2021
Feature: file format validation
  # see ticket #266
  # (and see https://www.jetbrains.com/help/idea/handling-issues.html to make this
  #  number clickable and leading to ZenHub)

  Scenario Outline: 1.a filename extension matches the file format - fastq
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      |           file_name |     file_format | validation_state |
      |       file.fastq.gz |        fastq.gz |            VALID |
      |          file.fq.gz |           fq.gz |            VALID |
      |          file.fastq |           fastq |            VALID |
      |   file.fastq.tar.gz |    fastq.tar.gz |            VALID |
      |             file.fq |              fq |            VALID |

  Scenario Outline: 1.b filename extension matches file format - non fastq
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      |  file_name | file_format | validation_state |
      | t.fastq.gz |    fastq.gz |            VALID |
      |      t.bam |         bam |            VALID |
      |      t.txt |         txt |            VALID |

  Scenario Outline: 2.a.1 valid fastq file - filename extension doesn't match the file format - both point to fastq validator
    Given a valid file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      |           file_name |       file_format | validation_state |
      |       file.fastq.gz |             fq.gz |          INVALID |
      |          file.fq.gz |          fastq.gz |          INVALID |
      |          file.fastq |             fq.gz |          INVALID |
      |   file.fastq.tar.gz |          fastq.gz |          INVALID |

  Scenario Outline: 2.a.2 invalid fastq file - filename extension doesn't match the file format - both point to fastq validator
    Given an invalid file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      |           file_name |   file_format | validation_state |
      |       file.fastq.gz |         fq.gz |          INVALID |
      |          file.fq.gz |      fastq.gz |          INVALID |
      |          file.fastq |         fq.gz |          INVALID |
      |   file.fastq.tar.gz |      fastq.gz |          INVALID |

  Scenario Outline: 2.b.1 filename extension doesn't match the file format -- filename extension pointing to fastq validator - file format not blank
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      |           file_name | file_format | validation_state |
      |       file.fastq.gz |         bam |          INVALID |
      |          file.fq.gz |         txt |          INVALID |
      |          file.fastq |         pdf |          INVALID |
      |   file.fastq.tar.gz |         doc |          INVALID |

  Scenario Outline: 2.b.2 filename extension doesn't match the file format -- filename extension pointing to fastq validator - file format is blank
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      |           file_name |       file_format | validation_state |
      |       file.fastq.gz |                   |            VALID |
      |          file.fq.gz |                   |            VALID |
      |          file.fastq |                   |            VALID |
      |   file.fastq.tar.gz |                   |            VALID |
      |             file.fq |                   |            VALID |

  Scenario Outline: 2.c.1 filename extension doesn't match the file format -- filename extension pointing to no validator - file format points to fastq validator
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      | file_name |  file_format | validation_state |
      |     t.bam |     fastq.gz |          INVALID |
      |     t.txt | fastq.tar.gz |          INVALID |
      |     t.pdf |        fastq |          INVALID |
      |     t.doc |           fq |          INVALID |

  Scenario Outline: 2.c.2 filename extension doesn't match the file format -- both filename extension and file format point to no validator
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated
    Then File is <validation_state> after validation

    Examples:
      | file_name | file_format | validation_state |
      |     t.bam |         txt |          INVALID |
      |     t.txt |         pdf |          INVALID |
      |     t.pdf |             |            VALID |
      |     t.doc |             |            VALID |

