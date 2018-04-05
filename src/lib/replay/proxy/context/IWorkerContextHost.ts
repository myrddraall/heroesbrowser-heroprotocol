import { IWorkerContext } from './IWorkerContext';

export interface IWorkerContextHost {
    readonly workerContext: IWorkerContext;

    dispose(): void;
}
