import {Given, When, Then} from "@cucumber/cucumber";
// see https://github.com/cucumber/cucumber-js
World('', function {
    // setup basic maetadata json
    // mock schemaValidator's external dependencies
    // also mocks.spys
})

Given('a data file with extension fastq.gz', async function() {
    // update the metadata json with a fastq.gz file
});


When ('metadata is validated', async function() {
    // run function under test
});

Then ('All files are valid after fastq validation', async function() {
    // assertions
    // spy checks
});