
export interface ILoadProtocolMessage {
    type: 'load-protocol';
    version: number;
}

export function isLoadProtocolMessage(obj: any): obj is ILoadProtocolMessage {
    return obj.type === 'load-protocol';
}


export interface ILoadProtocolResultMessage {
    type: 'load-protocol-result';
    version: number;
    code: string;
}

export function isLoadProtocolResultMessage(obj: any): obj is ILoadProtocolResultMessage {
    return obj.type === 'load-protocol-result';
}
