import { IWorkerContextHost } from './context/IWorkerContextHost';
import { IWorkerContext } from './context/IWorkerContext';
import { ReplayContextCaller } from './ReplayContextCaller';
export declare class ReplayAnalyserContextCaller implements IWorkerContextHost {
    private _replay;
    readonly workerContext: IWorkerContext;
    constructor(replay: ReplayContextCaller);
    dispose(): void;
}
