import config from "config";
import request from "request-promise";
import Promise from "bluebird";
import * as QueryString from "querystring";

const olsConnectionConfig: any = config.get("OLS_API.connection");
const olsSearchUrl: string = olsConnectionConfig["url"] + "/api/search";

class CurieExpansion {
    cachedOlsCurieResponses: any = {};

    constructor() {
        this.cachedOlsCurieResponses = {};
    }

    static isCurie(term: string) {
        let curie = true;
        if (term.split(":").length != 2 || term.includes("http")) {
            curie = false;
        }
        return curie;
    }

    expandCurie(term: string) {
        const olsQueryString = QueryString.stringify(
            {
                q: term,
                exact: true,
                groupField: true,
                queryFields: 'obo_id'
            }
        )
        const url = olsSearchUrl + '?' + olsQueryString;
        return new Promise((resolve, reject) => {
            let curieExpandResponsePromise: Promise<any> | null = null;

            if (this.cachedOlsCurieResponses[url]) {
                curieExpandResponsePromise = Promise.resolve(this.cachedOlsCurieResponses[url]);
            } else {
                curieExpandResponsePromise = request({
                    method: "GET",
                    url: url,
                    json: true
                }).promise();
            }

            curieExpandResponsePromise
                .then((resp: any) => {
                    this.cachedOlsCurieResponses[url] = resp;
                    let jsonBody = resp;
                    const groupedByOboId = jsonBody.response.docs.reduce((acc:any, doc:any) => {
                        const groupKey = doc['obo_id'].toLowerCase();
                        if (!acc[groupKey]) {
                            acc[groupKey] = [];
                        }
                        acc[groupKey].push(doc);
                        return acc;
                    }, {});

                    // Extract the `iri` of the first object in each group
                    const docs = Object.entries(groupedByOboId).map((group:any) => group[0]);
                    if (docs.length === 1) {
                        resolve(docs[0].iri);
                    } else {
                        reject(`Could not retrieve IRI for ${term}. OLS URL: ${url}. Num of documents returned: ${jsonBody.response.numFound}, Num of unique obo_is: ${docs.length}`);
                    }
                })
                .catch(err => {
                    reject(err)
                });
        });
    }
}

export default CurieExpansion;
