const R = require("ramda")
const config = require("config")
const {Given, When, Then} = require("@cucumber/cucumber");
const IngestFileValidator = require("../../dist/utils/ingest-client/ingest-file-validator").default;
const DocumentUpdateHandler = require("../../dist/listener/handlers/document-update-handler").default;
const assert = require("assert").strict;
const {setWorldConstructor} = require("@cucumber/cucumber");

let fileValidator;
let docHandler;

class fileValidationContext {
    constructor() {
        this.fileResource = {
            "content": {
                "describedBy": "https://schema.humancellatlas.org/type/file/9.2.0/sequence_file",
                "schema_type": "file",
                "file_core": {
                    "file_name": "test-file.fastq.gz",
                    "format": "fastq.gz"
                }
            },
            "fileName": "test-file.fastq.gz",
            "type": "File",
            "uuid": {
                "uuid": "test-uuid"
            },
            "validationState": "Valid",
            "validationErrors": [],
            "cloudUrl": "s3://test-bucket/test-uuid/test-file.fastq.gz",
            "checksums": {
                "sha1": "debc56cbaf3322ffedb47e4fa01c268331a85d12",
                "sha256": "879fff17b829b98d39c32249f36189052a3b2aa29c3368cd1f72de158cdd06d8",
                "crc32c": "61af8e62",
                "s3_etag": "512ce2153a3790fb7998c388fd1c0b33-21"
            },
            "validationJob": {
                "validationId": "366a3b27-59b6-451d-871d-4e53bf7e6f4d",
                "checksums": {
                    "sha1": "debc56cbaf3322ffedb47e4fa01c268331a85d12",
                    "sha256": "879fff17b829b98d39c32249f36189052a3b2aa29c3368cd1f72de158cdd06d8",
                    "crc32c": "61af8e62",
                    "s3_etag": "512ce2153a3790fb7998c388fd1c0b33-21"
                },
                "jobCompleted": true,
                "validationReport": {
                    "validationState": "Valid",
                    "validationErrors": []
                }
            },
            "dataFileUuid": "test-uuid",
            "_links": {
                "self": {
                    "href": "https://api.ingest.archive.data.humancellatlas.org/files/5f5fa003db657458f1bdc423"
                },
                "file": {
                    "href": "https://api.ingest.archive.data.humancellatlas.org/files/5f5fa003db657458f1bdc423",
                    "title": "A single file"
                },
                "validating": {
                    "href": "https://api.ingest.archive.data.humancellatlas.org/files/5f5fa003db657458f1bdc423/validatingEvent"
                },
                "validationJob": {
                    "href": "https://api.ingest.archive.data.humancellatlas.org/files/5f5fa003db657458f1bdc423/validationJob"
                }
            }
        };
    }

    setFileName(filename) {
        this.fileResource['fileName'] = filename;
        this.fileResource['content']['file_core']['file_name'] = filename;

    }

    setFileFormat(fileFormat) {
        this.fileResource['content']['file_core']['format'] = fileFormat;
    }

    setFileAsInvalid() {
        this.fileResource['validationJob']["validationReport"] =
            {
                "validationState": "Invalid",
                "validationErrors": [{
                    "errorType": "FILE_ERROR",
                    "message": "Invalid file because of something.",
                    "userFriendlyMessage": "File is invalid. Please fix."
                }]

            }
    }
}

setWorldConstructor(fileValidationContext);

Given(/^a file with filename (.*)$/, function (file_name) {
    this.setFileName(file_name);
});

Given(/^a valid file with filename (.*)$/, function (file_name) {
    this.setFileName(file_name);
});

Given(/^an invalid file with filename (.*)$/, function (file_name) {
    this.setFileAsInvalid();
});

Given(/^format field set to (.*)$/, function (file_format) {
    this.setFileFormat(file_format);
});

When(/^metadata is validated$/, function () {
    const validationImageConfigs = Object.entries(config.get("FILE_VALIDATION_IMAGES"));
    const validationImages = R.map((configEntry) => {
        return {fileFormat: configEntry[0], imageUrl: configEntry[1]}
    }, validationImageConfigs);
    fileValidator = new IngestFileValidator(null, validationImages, null);
    docHandler = new DocumentUpdateHandler(null, fileValidator, null)
    this.validationReport = docHandler.attemptFileValidation(this.fileResource['validationJob']['validationReport'], this.fileResource);
});

Then(/^File is (.*) after validation$/, async function (validation_state) {
    await this.validationReport.then(function (validationReport) {
        assert.equal(validationReport['validationState'].toLowerCase(), validation_state.toLowerCase());
    });
});

