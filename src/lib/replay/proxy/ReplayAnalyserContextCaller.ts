
import { IWorkerContextHost } from './context/IWorkerContextHost';
import { IWorkerContext } from './context/IWorkerContext';
import { ReplayContextCaller } from './ReplayContextCaller';
export class ReplayAnalyserContextCaller implements IWorkerContextHost {

    private _replay: ReplayContextCaller;
    public get workerContext(): IWorkerContext {
        return this._replay ? this._replay.workerContext : undefined;
    }

    public constructor(replay: ReplayContextCaller) {
        this._replay = replay;
        this.workerContext.addCallContext(this);
    }

    public dispose(): void {
        if (this._replay) {
            this.workerContext.removeCallContext(this);
            this._replay = undefined;
        }
    }

}
