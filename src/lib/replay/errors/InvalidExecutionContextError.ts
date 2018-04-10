import { ProxiableError } from '../proxy/error/ProxiableError';

export class InvalidExecutionContextError extends ProxiableError {
    constructor(message: string) {
        super('InvalidExecutionContextError', message);
    }
}