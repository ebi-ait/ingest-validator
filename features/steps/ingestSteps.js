// TODO convert to typescript
const R = require("ramda");
const jest = require("jest-mock");
const config = require("config");
const {Given, When, Then} = require("@cucumber/cucumber");

const IngestFileValidator = require("../../dist/utils/ingest-client/ingest-file-validator").default;
const DocumentUpdateHandler = require("../../dist/listener/handlers/document-update-handler").default;
const IngestClient = require("../../dist/utils/ingest-client/ingest-client").default;
const ValidationReport = require("../../dist/model/validation-report").default;
const fileMetadata = require("./fileMetadata.json");

const assert = require("assert").strict;
const {setWorldConstructor} = require("@cucumber/cucumber");

const MockFileResource = require("./mockFileResource");

class fileValidationContext {
    constructor() {
        this.validationReport = undefined;
        this.fileResource = JSON.parse(JSON.stringify(fileMetadata)); // deep copy
        this.mockFileResource = new MockFileResource(this.fileResource);
    }
}

setWorldConstructor(fileValidationContext);

Given(/^a file with filename (.*) which is not uploaded yet$/, function (file_name) {
    this.mockFileResource.setFileName(file_name);
    this.mockFileResource.removeCloudUrl();
});

Given(/^a valid file with filename (.*)$/, function (file_name) {
    this.mockFileResource.setFileName(file_name);
});

Given(/^an invalid file with filename (.*)$/, function (file_name) {
    this.mockFileResource.setFileAsInvalid();
});

Given(/^format field set to (.*)$/, function (file_format) {
    this.mockFileResource.setFileFormat(file_format);
});

Given(/^format field is empty$/, function () {
    this.mockFileResource.removeFileFormat();
});

When(/^metadata is validated$/, function () {
    const validationImageConfigs = Object.entries(config.get("FILE_VALIDATION_IMAGES"));

    const validationImages = R.map((configEntry) => {
        return {fileFormat: configEntry[0], imageUrl: configEntry[1]}
    }, validationImageConfigs);

    const ingestClient = new IngestClient('dummy-url');

    jest.spyOn(ingestClient, 'retrieveMetadataDocument').mockResolvedValue(this.fileResource);

    const fileValidator = new IngestFileValidator(null, validationImages, ingestClient);
    const docHandler = new DocumentUpdateHandler(null, fileValidator, ingestClient);

    const validationReport = new ValidationReport( this.fileResource.validationState);
    for(const err of this.fileResource.validationErrors){
        validationReport.addError(err.errorType)
    }

    jest.spyOn(docHandler, 'attemptFileValidation').mockResolvedValue(this.fileResource.validationJob.validationReport);

    this.validationReport = docHandler.checkEligibleForFileValidation(validationReport, 'dummy-url', 'FILE');
});

Then(/^File is (.*) after validation$/, async function (validation_state) {
    await this.validationReport.then(function (validationReport) {
        assert.equal(validationReport.validationState.toLowerCase(), validation_state.toLowerCase());
    });
});

Then(/^File is (.*) and has metadata and file not uploaded errors$/, async function (validation_state) {
    await this.validationReport.then(function (validationReport) {
        assert.equal(validationReport.validationState.toLowerCase(), validation_state.toLowerCase());
        assert.equal(validationReport.validationErrors.length, 2);
        assert.equal(validationReport.validationErrors[1].errorType, "FILE_NOT_UPLOADED");
        assert.equal(validationReport.validationErrors[0].errorType, "METADATA_ERROR");
    });
});
