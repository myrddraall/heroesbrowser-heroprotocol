import { ProxiableError } from '../proxy/error/ProxiableError';

export class GameTypeNotSupportedError extends ProxiableError {
    constructor(message: string) {
        super('GameTypeNotSupportedError', message);
    }
}