
import { IWorkerContextHost } from './context/IWorkerContextHost';
import { IWorkerContext } from './context/IWorkerContext';
import { WorkerContext } from './context/WorkerContext';
import {
    IReplayStatusMessage, isReplayStatusMessage,
    ILoadProtocolMessage, isLoadProtocolMessage, ILoadProtocolResultMessage
} from './messages';
import { HeroProtocol } from '../../';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { filter } from 'rxjs/operators';

export class ReplayContextCaller implements IWorkerContextHost {

    private _workerContext: IWorkerContext;
    private _statusSubject: Subject<IReplayStatusMessage> = new Subject();
    private _statusSubjectSubscription: Subscription;

    private _protocolLoaderSubscription: Subscription;

    public get workerContext(): IWorkerContext {
        return this._workerContext;
    }

    public get status(): Observable<IReplayStatusMessage> {
        return this._statusSubject.asObservable();
    }

    public get protocol(): Promise<any> {
        throw new Error('Protocol can only be accessed in the web worker context');
    }

    public constructor(mpqData?: ArrayBuffer) {
        this._workerContext = new WorkerContext(`./assets/worker/worker${HeroProtocol.env === 'production' ? '.min' : ''}.js`, mpqData, [mpqData]);
        this._workerContext.addCallContext(this);
        this._statusSubjectSubscription = this._workerContext.channelMessages.pipe(
            filter(msg => isReplayStatusMessage(msg))).subscribe(((statusMessage: IReplayStatusMessage) => {
                this._statusSubject.next(statusMessage);
            }));
        this._protocolLoaderSubscription = this._workerContext.channelMessages.pipe(
            filter(msg => isLoadProtocolMessage(msg))).subscribe((async (protocolMessage: ILoadProtocolMessage) => {
                console.log('ILoadProtocolMessage', protocolMessage);
                const code = await HeroProtocol.loadProtocol(protocolMessage.version);
                this.workerContext.send(<ILoadProtocolResultMessage>{
                    type: 'load-protocol-result',
                    version: protocolMessage.version,
                    code: code
                });
            }));
    }

    public dispose(): void {
        if (this._workerContext) {
            this._statusSubjectSubscription.unsubscribe();
            this._statusSubjectSubscription = undefined;
            this._statusSubject = undefined;
            this.workerContext.dispose();
            this._workerContext = undefined;
        }
    }
}


/*import { AbstractWorkerProxy } from './AbstractWorkerProxy';
import { isLoadProtocolMessage, ILoadProtocolResultMessage, isReplayStatusMessage, IReplayStatusMessage } from './messages';
import { HeroProtocol } from '../../';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

export class ReplayProxy extends AbstractWorkerProxy {

    private _statusSubject: BehaviorSubject<IReplayStatusMessage> = new BehaviorSubject(undefined);

    public constructor(mpqData?: ArrayBuffer) {
        super(new Worker('./assets/worker/worker.js'), mpqData, [mpqData]);
    }

    public get status(): BehaviorSubject<IReplayStatusMessage> {
        return this._statusSubject;
    }

    public get protocol(): Promise<any> {
        throw new Error('Protocol can only be accessed in the web worker context');
    }

    protected async handleWorkerMessage(data: any) {
        if (isLoadProtocolMessage(data)) {
            const code = await HeroProtocol.loadProtocol(data.version);
            this.send(<ILoadProtocolResultMessage>{
                type: 'load-protocol-result',
                version: data.version,
                code: code
            });
        } else if (isReplayStatusMessage(data)) {
            console.log(data);
            this._statusSubject.next(data);
        } else {
            super.handleWorkerMessage(data);
        }
    }
}
*/
