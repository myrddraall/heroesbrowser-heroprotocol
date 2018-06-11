import {
    IInitializeCommand,
    IWorkerCallMessage, isWorkerCallMessage,
    isWorkerPropertyCall, IWorkerPropertyCall,
    isWorkerMethodCall, IWorkerMethodCall,
    IWorkerCallResultMessage,

    IWorkerCommand, isWorkerCommand,
    IWorkerCommandResult, isWorkerCommandResult,
    isWorkerCallMethodCommand, IWorkerCallMethodCommand,
    isWorkerGetPropertyCommand, IWorkerGetPropertyCommand,
    ILoadProtocolMessage, isLoadProtocolResultMessage, ILoadProtocolResultMessage,
    ILoadHeroDataMessage, isLoadHeroDataMessage, ILoadHeroDataResultMessage, isLoadHeroDataResultMessage

} from './messages';
import { WorkerContextRegistry } from './context/WorkerContextRegistry';
import 'reflect-metadata';
import { debounceTime } from 'rxjs/operators';

import { Replay } from '../Replay';
export class ReplayWorker {
    private _replay: Replay;
    private _messagePort: MessagePort;
    private _protocolPromisies: { [version: number]: { resolve: Function, reject: Function, promise: Promise<string> } } = {};
    private _heroDataPromise: { resolve: Function, reject: Function, promise: Promise<any> };

    private _loadedContexts: Map<string, any> = new Map();

    constructor(initCmd: IInitializeCommand) {
        this._messagePort = initCmd.port;
        this._messagePort.onmessage = async (event) => {
            if (isWorkerCallMessage(event.data)) {
                try {
                    this.send(await this.handleWorkerCallMessage(event.data));
                } catch (e) {
                    const errMsg: IWorkerCallResultMessage = {
                        type: 'worker-call-result',
                        callId: event.data.callId,
                        error: true,
                        result: {
                            name: (<Error>e).name,
                            message: (<Error>e).message,
                            stack: (<Error>e).stack
                        }
                    };
                    this.send(errMsg);
                }
            } else if (isLoadProtocolResultMessage(event.data)) {
                this.handleProtocolResult(event.data);
            }else if (isLoadHeroDataResultMessage(event.data)) {
                this._heroDataPromise.resolve(event.data.data);
            }
        };
        this._replay = new Replay(initCmd.data);
        const replayContextId = WorkerContextRegistry.getContextCallerId(this._replay);
        this._loadedContexts.set(replayContextId, this._replay);

        this._replay.status.subscribe((status) => {
            if (status) {
                this.send(status);
            }
        });

        this._replay.loadProtocol = (version: number): Promise<string> => {
            if (this._protocolPromisies[version]) {
                return this._protocolPromisies[version].promise;
            }

            const promise = new Promise<string>((resolve, reject) => {
                this._protocolPromisies[version] = {
                    resolve,
                    reject,
                    promise: undefined
                };
            });
            this._protocolPromisies[version].promise = promise;
            this.send(<ILoadProtocolMessage>{
                type: 'load-protocol',
                version: version
            });
            return promise;
        };
        this._replay.loadHeroData = (): Promise<any> => {
            if (this._heroDataPromise) {
                return this._heroDataPromise.promise;
            }
            const promise = new Promise<any>((resolve, reject) => {
                this._heroDataPromise = {
                    resolve,
                    reject,
                    promise: undefined
                };
            });
            this._heroDataPromise.promise = promise;
            this.send(<ILoadHeroDataMessage>{
                type: 'load-hero-data'
            });
            return promise;
        };
        this._replay.initialize();
    }


    private send(data: any, transfer: any[] = []): void {
        this._messagePort.postMessage(data, transfer);
    }

    private handleProtocolResult(data: ILoadProtocolResultMessage) {
        const promise = this._protocolPromisies[data.version];
        promise.resolve(data.code);
    }


    private async handleWorkerCallMessage(msg: IWorkerCallMessage): Promise<any> {
        if (isWorkerPropertyCall(msg.data)) {
            return await this.handleWorkerPropertyCall(msg.callId, msg.data);
        } else if (isWorkerMethodCall(msg.data)) {
            return await this.handleWorkerMethodCall(msg.callId, msg.data);
        } else {
            throw new Error(`Unhandled Worker Call Message "${msg.type}"`);
        }
    }

    private async handleWorkerPropertyCall(callId: number, call: IWorkerPropertyCall) {
        const context = await this.getContextInstance(call.context);
        const value = await context[this.getPropertyName(context, call.propertyId)];
        const result: IWorkerCallResultMessage = {
            type: 'worker-call-result',
            callId,
            result: value
        };
        return result;
    }

    private async handleWorkerMethodCall(callId: number, call: IWorkerMethodCall) {
        const context = await this.getContextInstance(call.context);
        const fn: Function = context[this.getPropertyName(context, call.methodId)];
        console.log('handleWorkerMethodCall', call, this.getPropertyName(context, call.methodId));
        const value = await fn.apply(context, call.args || []);
        const result: IWorkerCallResultMessage = {
            type: 'worker-call-result',
            callId,
            result: value
        };
        return result;
    }

    /*private async handleWorkerCmd(cmd: IWorkerCommand): Promise<IWorkerCommandResult> {
        const context = this.getContextInstance(cmd.context);
        let result: IWorkerCommandResult;
        if (isWorkerGetPropertyCommand(cmd)) {
            const value = await context[this.getPropertyName(context, cmd.id)];
            result = {
                type: 'command-result',
                messageId: cmd.messageId,
                result: value
            };
        } else if (isWorkerCallMethodCommand(cmd)) {
            const fn: Function = context[this.getPropertyName(context, cmd.id)];
            return await fn.apply(context, cmd.args);
        }
        return result;
    }*/

    private async getContextInstance(contextId: string): Promise<any> {
        if (this._loadedContexts.has(contextId)) {
            return this._loadedContexts.get(contextId);
        }
        const contextType = WorkerContextRegistry.getContextCallerById(contextId);
        const contextInst = new contextType(this._replay);
        this._loadedContexts.set(contextId, contextInst);
        await contextInst.initialize();
        return contextInst;
    }

    private getPropertyName(context: Object, id: number) {
        const proxyMap = Reflect.getOwnMetadata('woker:proxyMethods', context.constructor);
        return proxyMap[id];
    }

}
