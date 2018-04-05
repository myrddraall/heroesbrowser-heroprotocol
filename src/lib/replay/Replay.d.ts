import { IHeroProtocol, IReplayHeader, IReplayDetails, IReplayInitData, IReplayTrackerEvent } from '../types';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { IReplayStatusMessage } from './proxy/messages';
export declare enum ReplayFiles {
    DETAILS = "replay.details",
    INITDATA = "replay.initdata",
    GAME_EVENTS = "replay.game.events",
    MESSAGE_EVENTS = "replay.message.events",
    TRACKER_EVENTS = "replay.tracker.events",
    ATTRIBUTES_EVENTS = "replay.attributes.events",
}
export declare class Replay {
    private _mpq;
    private _protocolPromise;
    private _protocol;
    private _header;
    private _data;
    private _statusSubject;
    private _stateSubject;
    private _progressSubject;
    private _progressSub;
    readonly status: BehaviorSubject<IReplayStatusMessage>;
    readonly protocol: Promise<IHeroProtocol>;
    readonly header: Promise<IReplayHeader>;
    readonly details: Promise<IReplayDetails>;
    readonly initData: Promise<IReplayInitData>;
    readonly gameEvents: Promise<IReplayDetails[]>;
    readonly messageEvents: Promise<IReplayDetails[]>;
    readonly trackerEvents: Promise<IReplayTrackerEvent[]>;
    readonly attributeEvents: Promise<IReplayDetails>;
    constructor(mpqData: ArrayBuffer);
    private manageStatus();
    private _lastProgressTime;
    private _lastProgress;
    protected updateStatus(status: string, current?: number, total?: number): void;
    private parseHeader();
    loadProtocol: (protocolVersion: number) => Promise<string>;
    private getProtocol(protocolVersion);
    private parse<T>(type);
    private parseEvents<T>(type);
    private data<T>(type);
    private events<T>(type);
    private asPromise<T>(value);
    dispose(): void;
}
