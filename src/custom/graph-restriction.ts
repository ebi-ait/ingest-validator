import * as ajv from "ajv";
import {Ajv, ErrorObject, KeywordDefinition, SchemaValidateFunction} from "ajv";
import CustomAjvKeyword from "./custom-ajv-keyword";
import config from "config";
import request from "request-promise";
import Promise from "bluebird";
import CurieExpansion from "../utils/curie-expansion";
import QueryString from "querystring";

class GraphRestriction implements CustomAjvKeyword {
    keywordName: string;

    constructor(keywordName?: string) {
        this.keywordName = keywordName ? keywordName : "graph_restriction";
    }

    /**
     *
     * Given an AJV validator, returns the validator with the graph-restriction keyword applied
     *
     * @param ajv
     */


    configure(ajv: Ajv): Ajv {
        return GraphRestriction._configure(ajv, this.keywordName);
    }

    static _configure(ajv: Ajv, keywordName: string): Ajv {
        const keywordDefinition: KeywordDefinition = {
            async: GraphRestriction._isAsync(),
            type: "string",
            validate: GraphRestriction._generateKeywordFunction(),
            errors: true
        };

        return ajv.addKeyword(keywordName, keywordDefinition);
    }

    keywordFunction(): SchemaValidateFunction {
        return GraphRestriction._generateKeywordFunction();
    }

    isAsync(): Boolean {
        return GraphRestriction._isAsync();
    }

    static _isAsync() {
        return true;
    }

    static _generateKeywordFunction(): SchemaValidateFunction {

        const olsConnectionConfig: any = config.get("OLS_API.connection");
        const olsSearchUrl: string = olsConnectionConfig["url"] + "/api/search";
        const cachedOlsResponses: { [key: string]: Promise<any> } = {};
        const curieExpansion = new CurieExpansion();

        const callCurieExpansion = (terms: string[]) => {
            let expanded = terms.map((t) => {
                if (CurieExpansion.isCurie(t)) {
                    return curieExpansion.expandCurie(t);
                } else {
                    return t
                }
            });

            return Promise.all(expanded);
        };

        const generateErrorObject: (message: string, dataPath: string) => ErrorObject = (message, dataPath) => {
            return {
                keyword: "graph_restriction",
                message: message,
                dataPath: dataPath,
                schemaPath: "",
                params: {}
            };
        };

        const findChildTerm = (schema: any, data: any, parentSchema: any, dataPath: any) => {
            return new Promise((resolve, reject) => {
                console.debug(`schema: ${JSON.stringify(schema)}`);

                let parentTerms = schema.classes;
                console.debug(`parentTerms: ${parentTerms}`);
                const ontologyIds = schema.ontologies;
                console.debug(`ontologyIds: ${ontologyIds}`);
                let errors: ErrorObject[] = [];

                if (parentTerms && ontologyIds) {
                    if (schema.include_self === true && parentTerms.includes(data)) {
                        resolve(data);
                    } else {
                        callCurieExpansion(parentTerms)
                            .then((iris) => {
                                const parentTerm = iris.join(",");
                                console.debug(`parentTerm: ${parentTerm}`);
                                const ontologyId = ontologyIds.join(",").replace(/obo:/g, "");
                                console.debug(`ontologyId: ${ontologyId}`);

                                const olsQueryString = QueryString.stringify(
                                    {
                                        q: data,
                                        exact: true,
                                        groupField: true,
                                        allChildrenOf: parentTerm,
                                        ontology: ontologyId,
                                        queryFields:'obo_id'
                                    }
                                )
                                const url = olsSearchUrl + '?' + olsQueryString;
                                console.debug(`url: ${url}`);
                                let olsResponsePromise = null;
                                if (cachedOlsResponses[url]) {
                                    olsResponsePromise = Promise.resolve(cachedOlsResponses[url]);
                                } else {
                                    olsResponsePromise = request({
                                        method: "GET",
                                        url: url,
                                        json: true
                                    });
                                }

                                olsResponsePromise
                                    .then((resp: any) => {
                                        cachedOlsResponses[url] = resp;
                                        let jsonBody = resp;

                                        if (jsonBody.response.numFound === 1) {
                                        } else if (jsonBody.response.numFound === 0) {
                                            errors.push(generateErrorObject(`Provided term is not child of [${parentTerm}]`, dataPath));
                                        } else {
                                            errors.push(generateErrorObject("Something went wrong while validating term, try again.", dataPath));
                                        }
                                        reject(new ajv.ValidationError(errors));
                                    })
                                    .catch(err => {
                                        errors.push(generateErrorObject(`An error occurred on ontology validation request for schema id ${schema['$id']}, term [${data}], ols url: ${url}: [${err.toLocaleString()}]`, dataPath));
                                        reject(new ajv.ValidationError(errors));
                                    });
                            })
                            .catch(err => {
                                errors.push(generateErrorObject(err, dataPath));
                                reject(new ajv.ValidationError(errors));
                            });
                    }
                } else {
                    errors.push(generateErrorObject("Missing required variable in schema graph_restriction, required properties are: parentTerm and ontologyId.", dataPath));
                    reject(new ajv.ValidationError(errors));
                }
            });
        };

        return findChildTerm;
    }
}

export default GraphRestriction;
