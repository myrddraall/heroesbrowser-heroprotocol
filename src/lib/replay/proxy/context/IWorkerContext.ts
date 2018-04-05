import { IWorkerContextHost } from './IWorkerContextHost';
import { Observable } from 'rxjs/Observable';

export interface IWorkerContext {
    readonly workerMessages: Observable<any>;
    readonly channelMessages: Observable<any>;

    send(data: any, transfer?: any[]): void;
    call<TResult>(data: any, cacheResult?: boolean, transfer?: any[]): Promise<TResult>;
    getProperty<TResult>(context: IWorkerContextHost, property: number, cacheResult?: boolean): Promise<TResult>;
    callMethod<TResult>(
        context: IWorkerContextHost, method: number, args?: any[], cacheResult?: boolean, transfer?: any[]
    ): Promise<TResult>;
    dispose(): void;
    tryDispose(): boolean;
    addCallContext(context: IWorkerContextHost): void;
    removeCallContext(context: IWorkerContextHost): void;
}
