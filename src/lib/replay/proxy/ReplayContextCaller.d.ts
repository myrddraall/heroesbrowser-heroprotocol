import { IWorkerContextHost } from './context/IWorkerContextHost';
import { IWorkerContext } from './context/IWorkerContext';
import { IReplayStatusMessage } from './messages';
import { Observable } from 'rxjs/Observable';
export declare class ReplayContextCaller implements IWorkerContextHost {
    private _workerContext;
    private _statusSubject;
    private _statusSubjectSubscription;
    private _protocolLoaderSubscription;
    readonly workerContext: IWorkerContext;
    readonly status: Observable<IReplayStatusMessage>;
    readonly protocol: Promise<any>;
    constructor(mpqData?: ArrayBuffer);
    dispose(): void;
}
