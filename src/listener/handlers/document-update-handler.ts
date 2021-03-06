/**
 * Created by rolando on 02/08/2018.
 */
import IngestValidator from "../../validation/ingest-validator";
import IngestFileValidator from "../../utils/ingest-client/ingest-file-validator";
import IngestClient from "../../utils/ingest-client/ingest-client";
import IHandler from "./handler";
import Promise from "bluebird";
import {
    NotEligibleForValidation,
    NoFileValidationImage
} from "../../validation/ingest-validation-exceptions";
import {
    NoUuidError,
    NoContentError,
    AlreadyInStateError,
    FileAlreadyValidatedError,
    FileCurrentlyValidatingError
} from "../../utils/ingest-client/ingest-client-exceptions";
import {FileValidationRequestFailed} from "../../utils/upload-client/upload-client-exceptions";
import ValidationReport from "../../model/validation-report";
import ErrorReport from "../../model/error-report";
import ErrorType from "../../model/error-type";
import config from "config";

class DocumentUpdateHandler implements IHandler {
    validator: IngestValidator;
    fileValidator: IngestFileValidator;
    ingestClient: IngestClient;

    constructor(validator: IngestValidator, fileValidator: IngestFileValidator, ingestClient: IngestClient) {
        this.validator = validator;
        this.fileValidator = fileValidator;
        this.ingestClient = ingestClient;
    }

    handle(msg: string): Promise<boolean> {
        const msgJson = JSON.parse(msg);
        return this._handle(msgJson)
            .then(() => {
                return Promise.resolve(true)
            })
            .catch((err) => {
                console.error(`Caught an unhandled exception, message will be ignored: ${err.toString()}`)
                return Promise.resolve(false)
            });
    }

    _handle(msgJson: any): Promise<any> {
        const callbackLink = msgJson['callbackLink'];
        const documentUrl = this.ingestClient.urlForCallbackLink(callbackLink);
        const documentType = msgJson['documentType'].toUpperCase();

        return this.ingestClient.getMetadataDocument(documentUrl)
            .then(doc => {
                return DocumentUpdateHandler.checkElegibleForValidation(doc)
            })
            .then(doc => {
                return this.signalValidationStarted(doc)
            })
            .then(doc => {
                return this.validator.validate(doc, documentType)
            })
            .then(contentValidationReport => {
                return this.checkEligibleForFileValidation(contentValidationReport, documentUrl, documentType)
            })
            .then(validationReport => {
                return this.ingestClient.postValidationReport(documentUrl, validationReport)
            })
            .then(resp => {
                return Promise.resolve(resp)
            })
            .catch(NotEligibleForValidation, err => {
                console.info("Document at " + documentUrl + " not eligible for validation, ignoring..");
                return Promise.resolve();
            })
            .catch(NoContentError, err => {
                console.info("Document at " + documentUrl + " has no content, ignoring..");
                return Promise.resolve();
            })
            .catch(NoUuidError, err => {
                console.info("Document at " + documentUrl + " has no uuid, ignoring...");
                return Promise.resolve();
            })
            .catch(AlreadyInStateError, err => {
                console.info("File document at " + documentUrl + " is already validating, ignoring...");
                return Promise.resolve();
            })
            .catch(err => {
                return Promise.reject(err);
            });
    }

    /**
     *
     * Only do file validation if schema validation passes for the resource and if
     * the resource is a file
     *
     * @param contentValidationReport
     * @param fileDocument
     * @param documentType
     *
     * @returns {Promise.<ValidationReport>}
     */
    attemptFileValidation(contentValidationReport: ValidationReport, fileDocument: any): Promise<ValidationReport> {
        // proceed with data file validation if metadata doc validation passes
        const fileName = fileDocument['fileName'];
        const fileFormat = fileDocument['content']['file_core']['format'];

        return new Promise((resolve, reject) => {
            this.fileValidator.validateFile(fileDocument, fileFormat, fileName).then(validationJob => {
                let validationReport = ValidationReport.validatingReport();

                if (validationJob.jobCompleted && validationJob.validationReport) {
                    validationReport = validationJob.validationReport
                }

                validationReport.validationJob = validationJob;
                resolve(validationReport);
            })
                .catch(FileValidationRequestFailed, err => {
                    const errReport = new ErrorReport(ErrorType.FileError, "File validation request failed");
                    const rep = new ValidationReport("INVALID", [errReport]);
                    resolve(rep);
                })
                .catch(FileAlreadyValidatedError, err => {
                    console.info(`Request to validate File with name ${fileName} but it was already validated`);
                    resolve(contentValidationReport);
                })
                .catch(FileCurrentlyValidatingError, err => {
                    console.info(`Request to validate File with name ${fileName} but it's currently validating`);
                    resolve(ValidationReport.validatingReport());
                })
                .catch(NoFileValidationImage, err => {
                    console.info("No matching validation image for file with file name " + fileName);
                    resolve(contentValidationReport);
                }).catch(err => {
                console.error("ERROR: error requesting file validation job " + err);
                reject(err);
            });
        });
    }

    /**
     * check if the document is a File and it is VALID, if so refresh the doc and check for an assigned cloudUrl.
     * proceed with file validation is cloudUrl present, other invalidate file validationState
     * @param contentValidationReport
     * @param documentUrl
     * @param documentType
     */
    checkEligibleForFileValidation(contentValidationReport: ValidationReport, documentUrl: string, documentType: string): Promise<ValidationReport> {
        if (documentType.toUpperCase() === 'FILE') {
            // refresh doc before checking cloudUrl
            return this.ingestClient.retrieveMetadataDocument(documentUrl)
                .then((doc: any) => {
                    const fileName = doc['fileName'];
                    const fileFormat = doc['content']['file_core']['format'];

                    const acceptedFileFormatForValidation = Object.keys(config.get("FILE_VALIDATION_IMAGES"));

                    if (this.isInvalidFileExtension(fileFormat, fileName)
                        || this.isInvalidFileFormat(fileFormat, fileName, acceptedFileFormatForValidation)) {
                        const msg = `The file with filename, "${fileName}", doesn't match the file format, "${fileFormat}", in the metadata.`;
                        contentValidationReport.addError(ErrorType.MetadataError, msg, msg)
                    }

                    if (!doc['cloudUrl']) {
                        const msg = "File cloudUrl property not set.";
                        contentValidationReport.addError(ErrorType.FileNotUploaded, msg, "File not uploaded.")
                    }

                    if (doc['cloudUrl'] && (contentValidationReport.validationState.toUpperCase() == "VALID")) {
                        return this.attemptFileValidation(contentValidationReport, doc);
                    }

                    return Promise.resolve(contentValidationReport);
                });
        }
        return Promise.resolve(contentValidationReport); // return original report if not eligible for file validation
    }

    private isInvalidFileExtension(fileFormat: string, fileName: string): boolean {
        return !!(!fileName.endsWith(fileFormat) && fileFormat);
    }

    private isInvalidFileFormat(fileFormat: string, fileName: string, acceptedFileFormatForValidation: string[]): boolean {
        return !!(fileFormat
                    && !acceptedFileFormatForValidation.includes(fileFormat)
                    && this.filenameMatchingFastqFilePattern(fileName, acceptedFileFormatForValidation)
        );
    }

    private filenameMatchingFastqFilePattern(fileName: string, fastqFormat: string[]): boolean {
        let isMatch = false;
        for (let extension of fastqFormat) {
            if (fileName.endsWith(extension)) {
                isMatch = true;
                break;
            }
        }

        return isMatch;
    }


    /**
     *
     * Eligible if document is in DRAFT
     *
     * @param document
     * @param documentType
     */
    static checkElegibleForValidation(document: any): Promise<any> {
        if (document['validationState'].toUpperCase() === 'DRAFT') {
            return Promise.resolve(document);
        } else {
            return Promise.reject(new NotEligibleForValidation());
        }
    }

    signalValidationStarted(document: any): Promise<any> {
        const documentUrl = this.ingestClient.selfLinkForResource(document);
        return this.ingestClient.transitionDocumentState(documentUrl, "VALIDATING");
    }

}

export default DocumentUpdateHandler;
