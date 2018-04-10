export class ProxiableError extends Error {
    constructor(name:string, message: string) {
        super(message);
        this.name = name;
    }
}