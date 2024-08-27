const fs = require("fs");
const GraphRestriction = require("@/custom/graph-restriction").default;
const SchemaValidator = require("@/validation/schema-validator").default;

describe('SchemaValidator', () => {
    const ontologyValidatorKeyword = new GraphRestriction("graph_restriction");
    const schemaValidator = new SchemaValidator([ontologyValidatorKeyword]);

    test(" -> graphRestriction Schema", () => {
        let inputSchema = fs.readFileSync("examples/schemas/graphRestriction-schema.json");
        let jsonSchema = JSON.parse(inputSchema);

        let inputObj = fs.readFileSync("examples/objects/graphRestriction_pass.json");
        let jsonObj = JSON.parse(inputObj);

        return schemaValidator.validateSingleSchema(jsonSchema, jsonObj)
            .then((data) => {
                expect(data).toBeDefined();
            });
    });

    test(" -> graphRestriction Schema", () => {
        let inputSchema = fs.readFileSync("examples/schemas/graphRestriction-schema.json");
        let jsonSchema = JSON.parse(inputSchema);

        let inputObj = fs.readFileSync("examples/objects/graphRestriction_normal.json");
        let jsonObj = JSON.parse(inputObj);

        return schemaValidator.validateSingleSchema(jsonSchema, jsonObj).then((data) => {
            expect(data).toBeDefined();
        });
    });

    test(" -> graphRestriction Schema", () => {
        let inputSchema = fs.readFileSync("examples/schemas/graphRestriction-schema.json");
        let jsonSchema = JSON.parse(inputSchema);

        let inputObj = fs.readFileSync("examples/objects/graphRestriction_fail.json");
        let jsonObj = JSON.parse(inputObj);

        return schemaValidator.validateSingleSchema(jsonSchema, jsonObj).then((data) => {
            expect(data).toBeDefined();
            expect(data[0]).toBeDefined();
        });
    });
});
