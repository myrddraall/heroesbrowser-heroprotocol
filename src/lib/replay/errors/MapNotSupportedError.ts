import { ProxiableError } from '../proxy/error/ProxiableError';

export class MapNotSupportedError extends ProxiableError {
    constructor(message: string) {
        super('MapNotSupportedError', message);
    }
}