import { IReplayAnalyser } from './IReplayAnalyser';
import { Replay } from '../Replay';
import { WorkerOnly, RunOnWorker } from '../decorators';
import { IReplayHeader, IReplayInitData, IReplayTrackerEvent, IReplayMessageEvent, IReplayDetails } from '../../types';
import { IReplayVeriosn, GameType } from './types';
import { ReplayVersionOutOfRangeError } from '../errors';
import * as linq from 'linq';
import * as semver from 'semver';

export abstract class AbstractReplayAnalyser implements IReplayAnalyser {

    private _replayHeader: IReplayHeader;
    private _replayVersion: IReplayVeriosn;
    private _initData: IReplayInitData;
    private _gameType: GameType;

    public constructor(protected replay: Replay) { }

    @WorkerOnly()
    public async initialize(): Promise<void> {
        const head = this._replayHeader = await this.replay.header;
        this._replayVersion = {
            protocol: head.m_version.m_baseBuild,
            build: head.m_version.m_build,
            major: head.m_version.m_major,
            minor: head.m_version.m_minor,
            revision: head.m_version.m_revision
        };
        const initData = this._initData = await this.replay.initData;
        this._gameType = this.getGameType();
    }

    @WorkerOnly()
    private getGameType(): GameType {
        const init = this._initData;
        const gameDesc = init.m_syncLobbyState.m_gameDescription;
        switch (gameDesc.m_gameOptions.m_ammId) {
            case 50021:
            case 50021:
                return GameType.MODE_AI;
            case 50001:
                return GameType.QUICK_MATCH;
            case 50031:
                return GameType.BRAWL;
            case 50051:
                return GameType.UNRANKED_DRAFT;
            case 50061:
                return GameType.HERO_LEAGUE;
            case 50071:
                return GameType.TEAM_LEAGUE;
            default:
                if (!gameDesc.m_gameOptions.m_competitive && !gameDesc.m_gameOptions.m_cooperative) {
                    if (gameDesc.m_gameOptions.m_heroDuplicatesAllowed) {
                        return GameType.CUSTOM;
                    } else {
                        return GameType.CUSTOM_DRAFT;
                    }
                }
                return GameType.UNKNOWN;
        }
    }

    @WorkerOnly()
    protected get protocolVersion(): number {
        return this._replayVersion.protocol;
    }

    @RunOnWorker()
    public get version(): Promise<IReplayVeriosn> {
        return (async (): Promise<IReplayVeriosn> => {
            return this._replayVersion;
        })();
    }

    @RunOnWorker()
    public get gameType(): Promise<GameType> {
        return (async (): Promise<GameType> => {
            return this._gameType;
        })();
    }

    public isGameType(type: GameType): Promise<boolean> {
        return (async (): Promise<boolean> => {
            const gameType = await this.gameType;
            return (gameType & type) === type;
        })();
    }

    @WorkerOnly()
    protected checkMinVersion(minVer: number, message?: string): void {
        if(!this.versionMatches('>=' + minVer)){
            throw new ReplayVersionOutOfRangeError(message || "Replay to Old");
        }
    }

    @WorkerOnly()
    public versionMatches(semVer:string):boolean{
        return semver.satisfies(this.protocolVersion + '.0.0', semVer);
    }

    @WorkerOnly()
    protected get header(): Promise<IReplayHeader> {
        return Promise.resolve(this._replayHeader);
    }

    @WorkerOnly()
    protected get initData(): Promise<IReplayInitData> {
        return Promise.resolve(this._initData);
    }

    @WorkerOnly()
    protected get details(): Promise<IReplayDetails> {
        return this.replay.details;
    }

    @WorkerOnly()
    protected get attributeEvents(): Promise<any> {
        return this.replay.attributeEvents;
    }

    @WorkerOnly()
    protected get trackerEvents(): Promise<IReplayTrackerEvent[]> {
        return this.replay.trackerEvents;
    }

    @WorkerOnly()
    protected get messageEvents(): Promise<any> {
        return this.replay.messageEvents;
    }

    @WorkerOnly()
    protected get gameEvents(): Promise<any> {
        return this.replay.gameEvents;
    }

    @WorkerOnly()
    protected get trackerEventsQueriable(): Promise<linq.IEnumerable<IReplayTrackerEvent>> {
        return (async (): Promise<linq.IEnumerable<IReplayTrackerEvent>> => {
            return linq.from(await this.trackerEvents);
        })();
    }

    @WorkerOnly()
    protected get messageEventsQueriable(): Promise<linq.IEnumerable<any>> {
        return (async (): Promise<linq.IEnumerable<any>> => {
            return linq.from(await this.messageEvents);
        })();
    }

    @WorkerOnly()
    protected get gameEventsQueriable(): Promise<linq.IEnumerable<any>> {
        return (async (): Promise<linq.IEnumerable<any>> => {
            return linq.from(await this.gameEvents);
        })();
    }

    public dispose(): void { }

}