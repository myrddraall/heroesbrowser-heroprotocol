import { ProxiableError } from '../proxy/error/ProxiableError';

export class ReplayToOldError extends ProxiableError {
    constructor(message: string) {
        super('ReplayToOldError', message);
    }
}