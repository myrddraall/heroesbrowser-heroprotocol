import { ProxiableError } from '../proxy/error/ProxiableError';

export class FailedToLoadProtocolError extends ProxiableError {

    constructor(public version: number, message: string) {
        super('FailedToLoadProtocolError', message);
    }
}