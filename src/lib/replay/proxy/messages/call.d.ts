export interface IWorkerCallMessage {
    type: 'worker-call';
    callId: number;
    data: any;
}
export declare function isWorkerCallMessage(obj: any): obj is IWorkerCallMessage;
export interface IWorkerCallResultMessage {
    type: 'worker-call-result';
    callId: number;
    error?: boolean;
    result?: any;
}
export declare function isWorkerCallResultMessage(obj: any): obj is IWorkerCallResultMessage;
export interface IWorkerPropertyCall {
    type: 'get-property';
    context: string;
    propertyId: number;
}
export declare function isWorkerPropertyCall(obj: any): obj is IWorkerPropertyCall;
export interface IWorkerMethodCall {
    type: 'call-method';
    context: string;
    methodId: number;
    args?: any[];
}
export declare function isWorkerMethodCall(obj: any): obj is IWorkerMethodCall;
