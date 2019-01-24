/**
 * Created by rolando on 06/08/2018.
 */
import {ValidationJob} from "../../common/types";

namespace ingestClientExceptions {
    export class NoUuidError extends Error {}
    export class RetryableError extends Error {}
    export class NotRetryableError extends Error {}
    export class AlreadyInStateError extends NotRetryableError {}
    export class LinkNotFoundOnResource extends Error {}

    export class FileAlreadyValidatedError extends Error {
        existingValidationJob: ValidationJob;
        constructor(existingValidationJob: ValidationJob) {
            super();
            this.existingValidationJob = existingValidationJob;
        }
    }
}

export = ingestClientExceptions;