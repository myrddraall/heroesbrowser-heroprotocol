import { IWorkerContext } from './IWorkerContext';
import { IWorkerCallContext } from './IWorkerCallContext';
export interface IWorkerContextHost extends IWorkerCallContext{
    readonly workerContext: IWorkerContext;
    dispose(): void;
}
