export interface IInitializeCommand {
    type: 'initialize';
    port: MessagePort;
    data: ArrayBuffer;
}

export function isInitializeCommand(obj: any): obj is IInitializeCommand {
    return obj.type === 'initialize' && obj.data instanceof ArrayBuffer && obj.port instanceof MessagePort;
}
