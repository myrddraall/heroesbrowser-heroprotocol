export interface IInitializeCommand {
    type: 'initialize';
    port: MessagePort;
    data: ArrayBuffer;
}
export declare function isInitializeCommand(obj: any): obj is IInitializeCommand;
