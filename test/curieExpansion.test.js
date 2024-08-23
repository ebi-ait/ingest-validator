const CurieExpansion = require("@/utils/curie-expansion").default;
describe('curie expansion', () => {
    const curieExpansion = new CurieExpansion();
    const curie = "EFO:0000399"

    test("isCurie", () => {
        const isCurie = CurieExpansion.isCurie(curie);
        expect(isCurie).toBe(true);

        // const uri = curieExpansion.expandCurie(curie)
        // expect(uri).toBe("http://www.ebi.ac.uk/efo/EFO_0000399");
    });

    test('single result from OLS', () => {
        curieExpansion.expandCurie(curie)
            .then((uri) => {
                expect(uri).toBe("http://www.ebi.ac.uk/efo/EFO_0000399");
            });
    });

    test('2 results from OLS, obo_id differs by case', () => {
        curieExpansion.expandCurie('HANCESTRO:0004')
            .then((uri) => {
                expect(uri).toBe("http://purl.obolibrary.org/obo/HANCESTRO_0004");
            });
    });

    test('0 results from OLS', async () => {
        await expect(curieExpansion.expandCurie('data:0006'))
            .rejects
            .toEqual(
                expect.stringContaining('Could not retrieve IRI for data:0006')
                && expect.stringContaining('Num of documents returned: 0')
            );
    });

})
