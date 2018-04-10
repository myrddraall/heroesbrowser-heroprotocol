import { ProxiableError } from '../proxy/error/ProxiableError';

export class ReplayVersionOutOfRangeError extends ProxiableError {
    constructor(message: string) {
        super('ReplayVersionOutOfRangeError', message);
    }
}