class MockFileResource {
    constructor(fileResource) {
        this.fileResource = fileResource
    }

    setFileName(filename) {
        this.fileResource['fileName'] = filename;
        this.fileResource['content']['file_core']['file_name'] = filename;

    }

    setFileFormat(fileFormat) {
        this.fileResource['content']['file_core']['format'] = fileFormat;
    }

    removeFileFormat() {
        delete this.fileResource['content']['file_core']['format'];
        this.fileResource['validationErrors'] = [
            {
                "errorType": "METADATA_ERROR",
                "message": "should have required property 'format'",
                "userFriendlyMessage": "should have required property 'format' at .file_core",
                "absoluteDataPath": ".file_core"
            },
            {
                "errorType": "FILE_NOT_UPLOADED",
                "message": "File cloudUrl property not set.",
                "userFriendlyMessage": "File not uploaded."
            }
        ];
        this.fileResource['validationState'] = 'Invalid';
    }

    setFileAsInvalid() {
        this.fileResource['validationJob']['validationReport'] =
            {
                'validationState': 'Invalid',
                'validationErrors': [{
                    'errorType': 'FILE_ERROR',
                    'message': 'Invalid file because of something.',
                    'userFriendlyMessage': 'File is invalid. Please fix.'
                }]

            }
    }

    removeCloudUrl() {
        delete this.fileResource['cloudUrl'];
    }
}

module.exports = MockFileResource;
