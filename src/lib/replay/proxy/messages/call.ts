export interface IWorkerCallMessage {
    type: 'worker-call';
    callId: number;
    data: any;
}

export function isWorkerCallMessage(obj: any): obj is IWorkerCallMessage {
    return !!obj && obj.type === 'worker-call' && typeof obj.callId === 'number' && 'data' in obj;
}


export interface IWorkerCallResultMessage {
    type: 'worker-call-result';
    callId: number;
    error?: boolean;
    result?: any;
}

export function isWorkerCallResultMessage(obj: any): obj is IWorkerCallResultMessage {
    return !!obj && obj.type === 'worker-call-result' && typeof obj.callId === 'number';
}


export interface IWorkerPropertyCall {
    type: 'get-property';
    context: string;
    propertyId: number;
}

export function isWorkerPropertyCall(obj: any): obj is IWorkerPropertyCall {
    return !!obj && obj.type === 'get-property' && typeof obj.context === 'string' && typeof obj.propertyId === 'number';
}

export interface IWorkerMethodCall {
    type: 'call-method';
    context: string;
    methodId: number;
    args?: any[];
}

export function isWorkerMethodCall(obj: any): obj is IWorkerMethodCall {
    return !!obj && obj.type === 'call-method' && typeof obj.context === 'string' && typeof obj.methodId === 'number';
}
