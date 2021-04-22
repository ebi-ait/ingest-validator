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
        delete this.fileResource['content']['file_core']['format']
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
