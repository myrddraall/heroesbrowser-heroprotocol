export class CorruptedError extends Error {
    public constructor(message = 'Corrupted Error') {
        super(message);
    }
}
