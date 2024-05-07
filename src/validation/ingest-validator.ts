/**
 * Created by rolando on 08/08/2018.
 */
import ValidationReport from "../model/validation-report";

import Promise from "bluebird";
import IngestClient from "../utils/ingest-client/ingest-client";
import {ErrorObject} from "ajv";
import SchemaValidator from "./schema-validator";
import ErrorReport from "../model/error-report";
import {NoDescribedBy, SchemaRetrievalError, NoFileMetadata} from "./ingest-validation-exceptions";
import R from "ramda";
import ErrorType from "../model/error-type";
import request from "request-promise";
import config from "config";

/**
 *
 * Wraps the generic validator, outputs errors in custom format.
 * Assumes documents have a describedBy
 *
 */
class IngestValidator {
    schemaValidator: SchemaValidator;
    ingestClient: IngestClient;
    schemaCache: any;
    baseUrl: string;
    endpoint: string;

    constructor(schemaValidator: SchemaValidator, ingestClient: IngestClient) {
        this.schemaValidator = schemaValidator;
        this.ingestClient = ingestClient;
        this.schemaCache = {};
        this.baseUrl = config.get("BIOVALIDATOR_API.baseUrl");
        this.endpoint = config.get("BIOVALIDATOR_API.endpoint");
    }

    validate(document: any, documentType: string) : Promise<ValidationReport> {
        const documentContent = document["content"];
        let schemaUri = documentContent && documentContent["describedBy"] ? documentContent["describedBy"] : document["described_by"];

        if (!schemaUri) {
            return Promise.reject(new NoDescribedBy("describedBy is a required field"));
        } else {
            return this.getSchema(schemaUri)
                .then(schema => {return IngestValidator.insertSchemaId(schema)})
                .then(schema => {
                    if (this.shouldUseBiovalidator(schema)) {
                        return this.validateWithBiovalidatorAndGenerateReport(schema, document);
                    } else {
                        return this.schemaValidator.validateSingleSchema(schema, documentContent)
                            .then(valErrors => {return IngestValidator.parseValidationErrors(valErrors)})
                            .then(parsedErrors => {return IngestValidator.generateValidationReport(parsedErrors)})
                    }
                })
                .catch(SchemaRetrievalError, err => {
                    const errReport = new ErrorReport(ErrorType.MetadataError, `Failed to retrieve schema at ${schemaUri}`);
                    return Promise.resolve(ValidationReport.invalidReport([errReport]));
                });
        }
    }

    getSchema(schemaUri: string): Promise<string> {
        if(! this.schemaCache[schemaUri]) {
            return new Promise((resolve, reject) => {
                this.ingestClient.fetchSchema(schemaUri)
                    .then(schema => {
                        this.schemaCache[schemaUri] = schema;
                        resolve(schema);
                    })
                    .catch(err => {
                        reject(new SchemaRetrievalError(err));
                    })
            });
        } else {
            return Promise.resolve(this.schemaCache[schemaUri]);
        }
    }

    static insertSchemaId(schema: any) : Promise<any> {
        if(schema["id"]) {
            schema["$id"] = schema["id"];
        }
        return Promise.resolve(schema);
    }

    /**
     * Ingest error reports from ajvError objects
     * @param errors
     */
    static parseValidationErrors(errors: ErrorObject[]) : Promise<ErrorReport[]> {
        return Promise.resolve(R.map((ajvErr: ErrorObject) => ErrorReport.constructWithAjvError(ajvErr), errors));
    }

    static generateValidationReport(errors: ErrorReport[]) : Promise<ValidationReport> {
        let report = null;

        if(errors.length > 0) {
            report = new ValidationReport("INVALID", errors);
        } else {
            report =  ValidationReport.okReport();
        }

        return Promise.resolve(report);
    }

    shouldUseBiovalidator(schema: any): boolean {
        // Implement logic to decide based on schema (e.g., checking $schema value for draft-07 or later)
        return schema['$schema'] && schema['$schema'].includes('2019');
    }

    private validateWithBiovalidatorAndGenerateReport(schema: any, documentContent: any): Promise<ValidationReport> {
        console.log("Found JSON Schema Draft 2019 - Using Biovalidator for validation");
        return this.validateWithBiovalidator(schema, documentContent)
            .then(biovalidatorResponse => {
                const errorReports = IngestValidator.parseBiovalidatorErrors(biovalidatorResponse);
                this.reportValidationErrors(errorReports);
                return IngestValidator.generateValidationReport(errorReports);
            })
            .catch(err => {
                return Promise.resolve(ValidationReport.invalidReport([
                    new ErrorReport(ErrorType.MetadataError, "Failed to validate with Biovalidator")
                ]));
            });
    }

    validateWithBiovalidator(schema: any, document: any): Promise<any> {
        try {
            const requiredFields = ['schema_type', 'schema_version', 'submissionDate', 'user', 'updateDate',
                'lastModifiedUser', 'uuid', 'content'];
            this.ensureRequiredFields(document, requiredFields);

            const payload = {
                schema: schema,
                data: {
                    described_by: document.described_by,
                    schema_type: document.schema_type,
                    schema_version: document.schema_version,
                    submitted_at: document.submissionDate,
                    submitted_by: document.user,
                    updated_at: document.updateDate,
                    updated_by: document.lastModifiedUser,
                    uuid: document.uuid.uuid,
                    content: document.content
                },
            };

            return new Promise<any>((resolve, reject) => {
                const options = {
                    method: "POST",
                    url: `${this.baseUrl}${this.endpoint}`,
                    body: payload,
                    json: true,
                };

                request(options)
                    .then(resp => resolve(resp))
                    .catch(err => reject(err));
            });
        } catch (err) {
            return Promise.reject(err);
        }
    }

    ensureRequiredFields(document: any, fields: string[]) {
        const missingFields: string[] = [];

        fields.forEach(field => {
            if (!this.getNestedProperty(document, field.split('.'))) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
        }
    }

    getNestedProperty(object: any, pathArray: string[]): any {
        return pathArray.reduce((obj, key) => {
            return (obj && obj[key] !== undefined) ? obj[key] : undefined;
        }, object);
    }

    static parseBiovalidatorErrors(errors: any[]): ErrorReport[] {
        return errors.map(err => {
            const message = err.errors.join("; ");
            return new ErrorReport(ErrorType.MetadataError, message, err.dataPath);
        });
    }

    private reportValidationErrors(errorReports: ErrorReport[]): void {
        if (errorReports.length > 0) {
            console.error('Validation Errors:');
            errorReports.forEach(report => {
                let errorMessage = `-`;
                if (report.userFriendlyMessage) {
                    errorMessage += ` ${report.userFriendlyMessage}`;
                }
                errorMessage += ` ${report.message}`
                console.error(errorMessage);
            });
        }
    }

}

export default IngestValidator;
