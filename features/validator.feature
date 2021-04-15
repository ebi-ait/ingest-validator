# Created by amnon at 12/04/2021
Feature: file format validation
  # see ticket #266
  # (and see https://www.jetbrains.com/help/idea/handling-issues.html to make this
  #  number clickable and leading to ZenHub)

  Scenario Outline: file extension matches file format
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated <file_name> <file_format>
    Then File is <validation_state> after validation

    Examples:
      |  file_name | file_format | validation_state |
      | t.fastq.gz |    fastq.gz |            VALID |
      |      t.bam |         bam |            VALID |
      |      t.txt |         txt |            VALID |

  Scenario Outline: file extension mismatches file formats
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated <file_name> <file_format>
    Then File is <validation_state> after validation

    Examples:
      | file_name | file_format | validation_state |
      |     t.bam |    fastq.gz |          INVALID |
      |     t.txt |         bam |          INVALID |
      |   t.fastq |         txt |          INVALID |

  Scenario Outline: file extension mismatches file formats - no validator
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated <file_name> <file_format>
    Then File is <validation_state> after validation

    Examples:
      | file_name | file_format | validation_state |
      |     t.bam |         pdf |          INVALID |
      |     t.txt |         bam |          INVALID |
      |     t.pdf |         txt |          INVALID |

  Scenario Outline: fastq file matches format
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated <file_name> <file_format>
    Then File is <validation_state> after validation

    Examples:
      |           file_name |       file_format | validation_state |
      |       file.fastq.gz |          fastq.gz |            VALID |
      |          file.fq.gz |             fq.gz |            VALID |
      |          file.fastq |             fastq |            VALID |
      |   file.fastq.tar.gz |      fastq.tar.gz |            VALID |

  Scenario Outline: fastq file matches format
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated <file_name> <file_format>
    Then File is <validation_state> after validation

    Examples:
      |           file_name |       file_format | validation_state |
      |       file.fastq.gz |             fq.gz |            VALID |
      |          file.fq.gz |          fastq.gz |            VALID |
      |          file.fastq |             fq.gz |            VALID |
      |   file.fastq.tar.gz |          fastq.gz |            VALID |


  Scenario Outline: fastq file with no format
    Given a file with filename <file_name>
    And format field set to <file_format>
    When metadata is validated <file_name> <file_format>
    Then File is <validation_state> after validation

    Examples:
      |         file_name |  file_format | validation_state |
      |           file.fq |              |            VALID |
      |        file.fq.gz |              |            VALID |
      |        file.fastq |              |            VALID |
      |     file.fastq.gz |              |            VALID |
      | file.fastq.tar.gz |              |            VALID |




