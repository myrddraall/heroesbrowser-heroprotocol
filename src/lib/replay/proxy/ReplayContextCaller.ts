
import { IWorkerContextHost } from './context/IWorkerContextHost';
import { IWorkerContext } from './context/IWorkerContext';
import { WorkerContext } from './context/WorkerContext';
import {
    IReplayStatusMessage, isReplayStatusMessage,
    ILoadProtocolMessage, isLoadProtocolMessage, ILoadProtocolResultMessage,
    isLoadHeroDataMessage, ILoadHeroDataResultMessage, ILoadHeroDataMessage
} from './messages';
import { HeroProtocol } from '../../heroprotocol';
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
        this._workerContext = new WorkerContext(`./assets/webworker/replay-worker${HeroProtocol.env === 'production' ? '.min' : ''}.js`, mpqData, [mpqData]);
        this._workerContext.addCallContext(this);
        this._statusSubjectSubscription = this._workerContext.channelMessages.pipe(
            filter(msg => isReplayStatusMessage(msg))).subscribe(((statusMessage: IReplayStatusMessage) => {
                this._statusSubject.next(statusMessage);
            }));
        this._protocolLoaderSubscription = this._workerContext.channelMessages.pipe(
            filter(msg => isLoadHeroDataMessage(msg))).subscribe((async (heroDataLoadMessage: ILoadHeroDataMessage) => {
                const data = await HeroProtocol.loadHeroData();
                this.workerContext.send(<ILoadHeroDataResultMessage>{
                    type: 'load-hero-data-result',
                    data: data
                });
            }));
        this._protocolLoaderSubscription = this._workerContext.channelMessages.pipe(
            filter(msg => isLoadProtocolMessage(msg))).subscribe((async (protocolMessage: ILoadProtocolMessage) => {
                const code = await HeroProtocol.loadProtocol(protocolMessage.version);
                this.workerContext.send(<ILoadProtocolResultMessage>{
                    type: 'load-protocol-result',
                    version: protocolMessage.version,
                    code: code
                });
            }));
    }

    public initialize(): Promise<void> {
        throw new Error('initialize can only be called in the web worker context');
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
