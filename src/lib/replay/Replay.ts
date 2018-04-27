import { Buffer } from 'buffer';
import { MPQArchive } from '@heroesbrowser/mpq';
import { HeroProtocol } from '../heroprotocol';
import {
    IHeroProtocol,
    IReplayHeader, IReplayDetails,
    IReplayInitData,
    FilteredEvents, IReplayEvent, IReplayTrackerEvent,
    IHeroData
} from '../types';
import { RunOnWorker, ReplayWorkerContext } from './decorators';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subscription } from 'rxjs/Subscription';
import { IReplayStatusMessage } from './proxy/messages';
import { debounceTime } from 'rxjs/operators/debounceTime';
import { timer } from 'rxjs/Observable/timer';
import { IWorkerCallContext } from './proxy/context/IWorkerCallContext';

function parseStrings<T>(data) {
    if (!data) {
        return data;
    } else if (data instanceof Buffer) {
        return data.toString();
    } else if (Array.isArray(data)) {
        return data.map(item => parseStrings(item));
    } else if (typeof data === 'object') {
        // tslint:disable-next-line:forin
        for (const key in data) {
            data[key] = parseStrings(data[key]);
        }
    }
    return data;
};


export enum ReplayFiles {
    DETAILS = 'replay.details',
    INITDATA = 'replay.initdata',
    GAME_EVENTS = 'replay.game.events',
    MESSAGE_EVENTS = 'replay.message.events',
    TRACKER_EVENTS = 'replay.tracker.events',
    ATTRIBUTES_EVENTS = 'replay.attributes.events',

}

const decoderMap = {
    [ReplayFiles.DETAILS]: 'decodeReplayDetails',
    [ReplayFiles.INITDATA]: 'decodeReplayInitdata',
    [ReplayFiles.GAME_EVENTS]: 'decodeReplayGameEvents',
    [ReplayFiles.MESSAGE_EVENTS]: 'decodeReplayMessageEvents',
    [ReplayFiles.TRACKER_EVENTS]: 'decodeReplayTrackerEvents',
    [ReplayFiles.ATTRIBUTES_EVENTS]: 'decodeReplayAttributesEvents',
};

@ReplayWorkerContext('008DCF70-B7E4-42DF-A3F9-4D2ADE13E718')
export class Replay implements IWorkerCallContext {

    private _mpq: MPQArchive;
    private _protocolPromise: Promise<IHeroProtocol>;
    private _protocol: IHeroProtocol;
    private _header: IReplayHeader;
    private _data: Map<ReplayFiles, any> = new Map<ReplayFiles, any>();
    private _statusSubject: BehaviorSubject<IReplayStatusMessage> = new BehaviorSubject(undefined);
    private _stateSubject: BehaviorSubject<IReplayStatusMessage> = new BehaviorSubject(undefined);
    private _progressSubject: BehaviorSubject<IReplayStatusMessage>;
    private _progressSub: Subscription;

    public get status(): BehaviorSubject<IReplayStatusMessage> {
        return this._statusSubject;
    }
    public get protocol(): Promise<IHeroProtocol> {
        if (this._protocol) {
            return this.asPromise(this._protocol);
        }
        return this.parseHeader().then(() => {
            return this.asPromise(this._protocol);
        });
    }

    public get heroData(): Promise<IHeroData> {
        return this.getHeroData();
    }

    public async initialize(): Promise<void> {
        await this.parseHeader();
        this.updateStatus('REPLAY_READY');
     }

    @RunOnWorker()
    public get header(): Promise<IReplayHeader> {
        if (this._header) {
            this.asPromise(this._header);
        }
        return this.parseHeader();
    }

    @RunOnWorker()
    public get details(): Promise<IReplayDetails> {
        return this.data<IReplayDetails>(ReplayFiles.DETAILS);
    }

    @RunOnWorker()
    public get initData(): Promise<IReplayInitData> {
        return this.data<IReplayInitData>(ReplayFiles.INITDATA);
    }

    @RunOnWorker()
    public get gameEvents(): Promise<IReplayDetails[]> {
        return this.events<IReplayDetails>(ReplayFiles.GAME_EVENTS);
    }

    @RunOnWorker()
    public get messageEvents(): Promise<IReplayDetails[]> {
        return this.events<IReplayDetails>(ReplayFiles.MESSAGE_EVENTS);
    }

    @RunOnWorker()
    public get trackerEvents(): Promise<IReplayTrackerEvent[]> {
        return this.events<IReplayTrackerEvent>(ReplayFiles.TRACKER_EVENTS);
    }

    @RunOnWorker()
    public get attributeEvents(): Promise<IReplayDetails> {
        return this.data<IReplayDetails>(ReplayFiles.ATTRIBUTES_EVENTS);
    }

    public constructor(mpqData: ArrayBuffer) {
        this._mpq = new MPQArchive(mpqData);
        console.log(this._mpq.files);
        // console.log('replay.load.info', this._mpq.readFile('replay.load.info').toString('utf-8'));
        //  console.log('replay.resumable.events', this._mpq.readFile('replay.resumable.events').toString('utf-8'));
        //  console.log('replay.server.battlelobby', this._mpq.readFile('replay.server.battlelobby').toString('utf-8'));
        this.manageStatus();
    }

    private manageStatus() {
        /* let progressSub = this._progressSubject.pipe(debounceTime(100)).subscribe((next) => {
             this._statusSubject.next(next);
         });*/

        const stateSub = this._stateSubject.subscribe((next) => {
            //progressSub.unsubscribe();

            // this._progressSubject = new BehaviorSubject<IReplayStatusMessage>(undefined);
            this._statusSubject.next(next);
            /* progressSub = this._progressSubject.pipe(debounceTime(100)).subscribe((nextProgress) => {
                 this._statusSubject.next(nextProgress);
             });*/
        });
    }

    private _lastProgressTime = 0;
    private _lastProgress: IReplayStatusMessage;

    protected updateStatus(status: string, current = 0, total = -1): void {
        const msg: IReplayStatusMessage = {
            type: 'replay-status',
            status,
            current,
            total
        };

        if (total === -1) {
            if (this._lastProgress) {
                this._stateSubject.next(this._lastProgress);
                this._lastProgress = undefined;
            }
            this._stateSubject.next(msg);
        } else {
            const now = new Date().getTime();
            const delta = now - this._lastProgressTime;
            if (delta > 10) {
                this._stateSubject.next(msg);
                this._lastProgressTime = now;
            } else {
                this._lastProgress = msg;
            }
            /*if (!this._progressSubject) {
                this._progressSubject = new BehaviorSubject(undefined);
                this._progressSub = this._progressSubject.pipe(debounceTime(10)).subscribe((nextProgress) => {
                    this._statusSubject.next(nextProgress);
                });
            }*/
            //this._progressSubject.next(msg);
        }

    }

    private async parseHeader(): Promise<IReplayHeader> {
        this.updateStatus('parseHeader');
        const headProtocol = await this.getProtocol(29406);
        const rawHeader = parseStrings(headProtocol.decodeReplayHeader(this._mpq.header.userDataHeader.content));
        this._protocolPromise = this.getProtocol(rawHeader.m_version.m_baseBuild);
        this._protocol = await this._protocolPromise;
        this._header = parseStrings(this._protocol.decodeReplayHeader(this._mpq.header.userDataHeader.content));
        this.updateStatus('parseHeader', -1);
        return this._header;
    }


    public loadProtocol = async (protocolVersion: number): Promise<string> => {
        return await HeroProtocol.loadProtocol(protocolVersion);
    }

    public loadHeroData = async (): Promise<IHeroData> => {
        return await HeroProtocol.loadHeroData();
    }

    private async getProtocol(protocolVersion: number): Promise<IHeroProtocol> {
        this.updateStatus('getProtocol');
        if (HeroProtocol.hasProtocol(protocolVersion)) {
            return HeroProtocol.getProtocol(protocolVersion);
        }
        const code = await this.loadProtocol(protocolVersion);
        const protocol = HeroProtocol.compile(protocolVersion, code);
        this.updateStatus('getProtocol', -1);
        return protocol;
    }

    private async getHeroData(): Promise<IHeroData> {
        this.updateStatus('getHeroData');
        const data = await this.loadHeroData();
        this.updateStatus('getHeroData', -1);
        return data;
    }

    private async parse<T>(type: ReplayFiles): Promise<T> {
        const protocol = await this.protocol;
        const data = parseStrings(protocol[decoderMap[type]](this._mpq.readFile(type)));
        this._data.set(type, data);
        return data;
    }

    private async parseEvents<T>(type: ReplayFiles): Promise<T[]> {
        const protocol = await this.protocol;
        const eventGen = protocol[decoderMap[type]](this._mpq.readFile(type));
        const events: T[] = [];

        this.updateStatus('parse-event-' + type, 0, protocol.progress.total);
        for (const event of eventGen) {
            if (FilteredEvents.indexOf(event._event) === -1) {
                events.push(parseStrings(event));
            }
            this.updateStatus('parse-event-' + type, protocol.progress.current, protocol.progress.total);
        }
        this._data.set(type, events);
        this.updateStatus('parse-event-' + type, -1);
        return events;
    }

    private data<T>(type: ReplayFiles): Promise<T> {
        if (this._data.has(type)) {
            return this.asPromise<T>(this._data.get(type));
        }
        return this.parse<T>(type);
    }

    private events<T>(type: ReplayFiles): Promise<T[]> {
        if (this._data.has(type)) {
            return this.asPromise<T[]>(this._data.get(type));
        }
        return this.parseEvents<T>(type);
    }


    private asPromise<T>(value: T): Promise<T> {
        return new Promise((res, rej) => {
            res(value);
        });
    }

    public dispose(): void {
        this._mpq = undefined;
        this._data = undefined;
        this._header = undefined;
        this._protocol = undefined;
    }
}
