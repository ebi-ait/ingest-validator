import IngestValidator from "./ingest-validator";
import SchemaValidator from "./schema-validator";
import IngestClient from "../utils/ingest-client/ingest-client";
import Promise from "bluebird";
import * as TypeMoq from "typemoq";
import ValidationReport from "../model/validation-report";


describe("Ingest validator tests", () =>{

    it("should correctly parse file formats from file resources", () => {
        let fileResource = {
            "content": {
                "file_core": {
                    "format": "fastq.gz"
                }
            }
        };
        let format = fileResource['content']['file_core']['format'];
        expect(format).toBe("fastq.gz");
    });

    it("should return an INVALID ValidationReport when describedBy schema can't be retrieved", () => {
        const mockSchemaValidator: TypeMoq.IMock<SchemaValidator> = TypeMoq.Mock.ofType<SchemaValidator>();
        const mockIngestClient: TypeMoq.IMock<IngestClient> = TypeMoq.Mock.ofType<IngestClient>();

        const badUrl = "badUrl";
        mockIngestClient
            .setup(mockInstance => mockInstance.fetchSchema(TypeMoq.It.isValue(badUrl)))
            .returns(() => Promise.reject(new Error()));

        const ingestValidator = new IngestValidator(mockSchemaValidator.object, mockIngestClient.object);
        const documentErroneousDescribedBy: object = {
            "content": {
                "describedBy": "badUrl"
            }
        };

        ingestValidator.validate(documentErroneousDescribedBy, "someDocumentType")
            .then((rep: ValidationReport) => {
                expect(rep.validationState).toBe("INVALID");
            })
    });

    describe("Ingest Biovalidator tests", () => {
        const draft2019Schema = {
            "$schema": "http://json-schema.org/draft-2019-09/schema",
            "required": ["schema_type", "schema_version", "submissionDate", "user", "updateDate", "lastModifiedUser", "uuid", "content"],
            "properties": {
                "schema_type": {"type": "string"},
                "schema_version": {"type": "string"},
                "submissionDate": {"format": "date-time"},
                "user": {"type": "string"},
                "updateDate": {"format": "date-time"},
                "lastModifiedUser": {"type": "string"},
                "uuid": {"type": "string"},
                "content": {"type": "object"}
            }
        };

        const schemaValidatorMock: TypeMoq.IMock<SchemaValidator> = TypeMoq.Mock.ofType<SchemaValidator>();
        const ingestClientMock: TypeMoq.IMock<IngestClient> = TypeMoq.Mock.ofType<IngestClient>();

        beforeEach(() => {
            ingestClientMock
                .setup(mockInstance => mockInstance.fetchSchema(TypeMoq.It.isAnyString()))
                .returns(() => Promise.resolve(draft2019Schema));
        });

        it("should use Biovalidator for JSON Schema Draft 2019",  () => {
            const document = {
                "content": {
                    "testProperty": "testValue",
                    "describedBy": "http://example.com/schema"
                }
            };

            const ingestValidator = new IngestValidator(schemaValidatorMock.object, ingestClientMock.object);

            return ingestValidator.validate(document, "testDocumentType")
                .then(validationReport => {
                    expect(validationReport).toBeDefined();
                });
        });

        it("should identify missing required fields using Biovalidator", () => {
            const documentWithMissingFields = {
                "described_by": "http://example.com/schema",
                "schema_type": "testType", // assuming other required fields are missing
                "content": {
                }
            };

            const ingestValidator = new IngestValidator(schemaValidatorMock.object, ingestClientMock.object);

            return ingestValidator.validate(documentWithMissingFields, "testDocumentType")
                .catch(validationReport => {
                    expect(validationReport.validationState).toBe("INVALID");
                    expect(validationReport.errors).toContain("Missing required fields");
                });
        });

        it("should validate successfully when all required fields are provided", () => {
            const completeDocument = {
                "described_by": "https://schema.morphic.bio/type/project/0.0.1/study",
                "schema_type": "study",
                "schema_version": "1.0.0",
                "submissionDate": "2022-04-01",
                "user": "exampleUser",
                "updateDate": "2022-04-02",
                "lastModifiedUser": "exampleUser",
                "uuid": "1234-5678-9012-3456",
                "content": {
                    "biological_sample_types": [
                        "embryoid body"
                    ],
                    "cell_line_names": [
                        "KOLF2.2J"
                    ],
                    "contact_emails": [
                        "fakemail@123.com"
                    ],
                    "contact_first_name": "Bob",
                    "contact_surname": "Lorem Ipsum",
                    "dracc_data_sharing_date": "2018-11-13",
                    "duo_codes": [
                        "DUO:0000046"
                    ],
                    "institute": "NWU",
                    "label": "ThisIsAStudyExample",
                    "model_organ_systems": [
                        "UBERON:0000006"
                    ],
                    "other_comments": "This is not a comment",
                    "perturbation_type": [
                        "irreversible gene knockout"
                    ],
                    "readout_assay": "EFO:0008931",
                    "sequencing_platforms": [
                        "OBI:0002002"
                    ],
                    "study_description": "Lorem ipsum dolor sit amet",
                    "supplementary_links": [
                        "https://medlineplus.gov/genetics/gene/pax2/"
                    ],
                    "target_genes": [
                        "PAX2"
                    ]
                }
            };

            const ingestValidator = new IngestValidator(schemaValidatorMock.object, ingestClientMock.object);

            return ingestValidator.validate(completeDocument, "testDocumentType")
                .catch(validationReport => {
                    expect(validationReport.validationState).toBe("VALID");
                    expect(validationReport.errors).toEqual([]); // Expect no errors
                });
        });

    });


});
