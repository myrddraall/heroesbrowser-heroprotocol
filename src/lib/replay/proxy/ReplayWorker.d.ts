import { IInitializeCommand } from './messages';
import 'reflect-metadata';
import 'rxjs/operators/debounce';
export declare class ReplayWorker {
    private _replay;
    private _messagePort;
    private _protocolPromisies;
    private _loadedContexts;
    constructor(initCmd: IInitializeCommand);
    private send(data, transfer?);
    private handleProtocolResult(data);
    private handleWorkerCallMessage(msg);
    private handleWorkerPropertyCall(callId, call);
    private handleWorkerMethodCall(callId, call);
    private getContextInstance(contextId);
    private getPropertyName(context, id);
}
