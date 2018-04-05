export interface ILoadProtocolMessage {
    type: 'load-protocol';
    version: number;
}
export declare function isLoadProtocolMessage(obj: any): obj is ILoadProtocolMessage;
export interface ILoadProtocolResultMessage {
    type: 'load-protocol-result';
    version: number;
    code: string;
}
export declare function isLoadProtocolResultMessage(obj: any): obj is ILoadProtocolResultMessage;
