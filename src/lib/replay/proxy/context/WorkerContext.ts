
import { IWorkerContext } from './IWorkerContext';
import { IWorkerContextHost } from './IWorkerContextHost';
import {
    IInitializeCommand, IWorkerCallMessage,
    isWorkerCallResultMessage, IWorkerCallResultMessage,
    IWorkerPropertyCall, IWorkerMethodCall
} from '../messages';
import { WorkerContextRegistry } from './WorkerContextRegistry';

import { Subject ,  Observable } from 'rxjs';

import * as sha1 from 'sha1';

export class WorkerContext implements IWorkerContext {



    private _initialized: boolean;
    private _worker: Worker;
    private _port: MessagePort;
    private _initMessageQueue: Array<Array<any>> = [];
    private _workerMessages: Subject<any> = new Subject();
    private _channelMessages: Subject<any> = new Subject();

    private _callId = 0;
    private _resultCache: Map<string, any> = new Map<string, any>();
    private _callPromises: { [_messageId: number]: { resolve: any, reject: any, cacheKey?: string } } = {};
    private _pendingCachePromises: { [key: string]: Promise<any> } = {};


    private _contextCallers: Set<IWorkerContextHost> = new Set();

    public get workerMessages(): Observable<any> {
        return this._workerMessages.asObservable();
    }

    public get channelMessages(): Observable<any> {
        return this._channelMessages.asObservable();
    }

    public constructor(private workerPath: string, initData?: any, initTransfer: any[] = []) {
        this._worker = new Worker(workerPath);
        this.initialize(initData, initTransfer);
    }

    private initialize(initData: any, initTransfer: any[]) {
        this._worker.onmessage = (event) => {
            if (event.data === 'WORKER_INITIALIZED') {
                this._initialized = true;
                for (let i = 0; i < this._initMessageQueue.length; i++) {
                    const arg = this._initMessageQueue[i];
                    this.send(arg[0], arg[1]);
                }
            } else {
                this._workerMessages.next(event.data);
            }
        };

        const messageChannel = new MessageChannel();
        this._port = messageChannel.port1;

        this._port.onmessage = (event) => {
            if (!this.handleChannelMessage(event.data)) {
                this._channelMessages.next(event.data);
            }
        };

        const initCommand: IInitializeCommand = {
            type: 'initialize',
            port: messageChannel.port2,
            data: initData
        };

        this._worker.postMessage(initCommand, [messageChannel.port2, ...initTransfer]);
    }

    private handleChannelMessage(msg: any): boolean {
        if (isWorkerCallResultMessage(msg)) {
            this.handleWorkerCallResult(msg);
            return true;
        }
        return false;
    }

    private computeCacheKey(...args): string {
        const dataStr = JSON.stringify(args, (key, value) => {
            return value;
        });
        return sha1(dataStr);
    }

    private hasCache(key: string): boolean {
        return this._resultCache.has(key);
    }

    private getCache(key: string): any {
        return this._resultCache.get(key);
    }

    private setCache(key: string, value: any): void {
        this._resultCache.set(key, value);
    }

    private handleWorkerCallResult(data: IWorkerCallResultMessage) {
        const promise = this._callPromises[data.callId];
        delete this._callPromises[data.callId];

        if (promise.cacheKey) {
            delete this._pendingCachePromises[promise.cacheKey];
        }

        if (data.error) {
            promise.reject(data.result);
        } else {
            if (promise.cacheKey) {
                this.setCache(promise.cacheKey, data.result);
            }
            promise.resolve(data.result);
        }
    }

    public send(data: any, transfer?: any[]): void {
        if (!this._initialized) {
            this._initMessageQueue.push([data, transfer]);
        } else {
            this._port.postMessage(data, transfer);
        }
    }

    public call<TResult>(data: any, cacheResult = true, transfer?: any[]): Promise<TResult> {
        const callId = this._callId++;
        const cacheKey = cacheResult ? this.computeCacheKey(data) : undefined;

        if (cacheResult && this.hasCache(cacheKey)) {
            return new Promise((res) => {
                res(this.getCache(cacheKey));
            });
        }

        if (cacheResult && this._pendingCachePromises[cacheKey]) {
            return this._pendingCachePromises[cacheKey];
        }

        const promise = new Promise<TResult>((resolve, reject) => {
            this._callPromises[callId] = {
                resolve,
                reject,
                cacheKey
            };
            this.send(<IWorkerCallMessage>{
                type: 'worker-call',
                callId,
                data
            });
        });
        if (cacheResult) {
            this._pendingCachePromises[cacheKey] = promise;
        }
        return promise;
    }

    public getProperty<TResult>(context: IWorkerContextHost, propertyId: number, cacheResult?: boolean): Promise<TResult> {
        const call: IWorkerPropertyCall = {
            type: 'get-property',
            context: WorkerContextRegistry.getContextCallerId(context),
            propertyId
        };
        return this.call(call, cacheResult);
    }
    public callMethod<TResult>(
        context: IWorkerContextHost, methodId: number, args?: any[], cacheResult?: boolean, transfer?: any[]
    ): Promise<TResult> {
        const call: IWorkerMethodCall = {
            type: 'call-method',
            context: WorkerContextRegistry.getContextCallerId(context),
            methodId,
            args
        };
        return this.call(call, cacheResult, transfer);
    }

    public addCallContext(context: IWorkerContextHost): void {
        this._contextCallers.add(context);
    }
    public removeCallContext(context: IWorkerContextHost): void {
        this._contextCallers.delete(context);
    }

    public tryDispose(): boolean {
        if (this._contextCallers.size > 0) {
            return false;
        }
        this.dispose();
        return true;
    }

    public dispose(): void {
        if (this._worker) {
            this._worker.terminate();
            this._worker = undefined;
            this._initialized = false;
            this._port = undefined;
            this._initMessageQueue = undefined;
            this._callPromises = undefined;
            this._pendingCachePromises = undefined;
        }
    }
}
