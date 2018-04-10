import { Replay } from '../../Replay';
//import { IReplayTrackerEvent, isSUnitBornEvent, ISUnitBornEvent } from '../types';
import * as linq from 'linq';
import * as sha1 from 'sha1';
import { IReplayDetailsPlayer } from '../../../types';
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
// tslint:disable:no-bitwise
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { GameType, IReplayVeriosn } from '../types';


export interface ReplayDescription {
    fingerPrint: string;
    mapName: string;
    gameDurationTicks: number;
    gameDuration: number;
    version: IReplayVeriosn;
    gameType: GameType;
    timeZone: number;
    playedOn: Date;
    winningTeam: number;
    players: BasicPlayerData[];
}

export interface BasicPlayerData {
    id: string;
    name: string;
    hero: string;
    team: number;
    won: boolean;
    observer: boolean;
}

@ReplayAnalyserContext('1B90BC76-8CE8-495C-A978-ABFD78DBB72A')
export class BasicReplayAnalyser extends AbstractReplayAnalyser {

    public constructor(replay: Replay) {
        super(replay);
    }

    @RunOnWorker()
    public get fingerPrint(): Promise<string> {
        return (async (): Promise<string> => {
            let fp = '';
            const head = await this.header;
            const init = await this.initData;
            fp = head.m_elapsedGameLoops.toString(16);
            fp += '|' + init.m_syncLobbyState.m_gameDescription.m_randomValue;
            fp += '|' + init.m_syncLobbyState.m_gameDescription.m_gameOptions.m_ammId;
            fp += '|' + linq.from(init.m_syncLobbyState.m_lobbyState.m_slots)
                .toJoinedString('#', elm => elm.m_hero + '~' + elm.m_teamId + '~' + elm.m_toonHandle);
            return sha1(fp);
        })();
    }

    @RunOnWorker()
    public get gameDurationTicks(): Promise<number> {
        return (async (): Promise<number> => {
            const head = await this.header;
            return head.m_elapsedGameLoops;
        })();
    }

    public get gameDuration(): Promise<number> {
        return (async (): Promise<number> => {
            return (await this.gameDurationTicks) / 16;
        })();
    }

    @RunOnWorker()
    public get mapName(): Promise<string> {
        return (async (): Promise<string> => {
            const details = await this.details;
            return details.m_title;
        })();
    }

    @RunOnWorker()
    public get winningTeam(): Promise<number> {
        return (async (): Promise<number> => {
            const details = await this.details;
            return details.m_playerList[0].m_teamId === 0 && details.m_playerList[0].m_result === 1 ? 0 : 1;
        })();
    }

    @RunOnWorker()
    public get timeZone(): Promise<number> {
        return (async (): Promise<number> => {
            const details = await this.details;
            return details.m_timeLocalOffset / 10000000 / 60 / 60;
        })();
    }

    @RunOnWorker()
    public get playedOn(): Promise<Date> {
        return (async (): Promise<Date> => {
            const details = await this.details;
            return new Date(details.m_timeUTC / 10000 - 11644473600000);
        })();
    }

    @RunOnWorker()
    public get playerList(): Promise<BasicPlayerData[]> {
        return (async (): Promise<BasicPlayerData[]> => {
            const init = await this.initData;
            const details = await this.details;

            const slots = linq.from(init.m_syncLobbyState.m_userInitialData).select((slot, i) => ({ slot, i }));
            const us = slots.join(linq.from(init.m_syncLobbyState.m_lobbyState.m_slots), d => d.i, s => s.m_userId, (d, s) => {
                return Object.assign({}, s, { m_name: d.slot.m_name })
            });
            const pl = linq.from(details.m_playerList);

            const playerList = us.groupJoin(
                pl, s => s.m_workingSetSlotId, p => p.m_workingSetSlotId, (s, p: any
                ) => ({
                    slot: s,
                    player: <IReplayDetailsPlayer>p.firstOrDefault()
                })).select(p => ({
                    id: p.slot.m_toonHandle,
                    name: p.slot.m_name,
                    team: p.player ? p.player.m_teamId : null,
                    hero: p.player ? p.player.m_hero : null,
                    won: p.player ? p.player.m_result === 1 : null,
                    observer: p.slot.m_observe === 1
                }));

            return playerList.toArray();

        })();
    }

    @RunOnWorker()
    public get replayDescription(): Promise<ReplayDescription> {
        return (async (): Promise<ReplayDescription> => {
            return {
                fingerPrint: await this.fingerPrint,
                gameType: await this.gameType,
                version: await this.version,
                gameDurationTicks: await this.gameDurationTicks,
                gameDuration: await this.gameDuration,
                mapName: await this.mapName,
                timeZone: await this.timeZone,
                playedOn: await this.playedOn,
                winningTeam: await this.winningTeam,
                players: await this.playerList
            };
        })();
    }

    /*
        private _trackerQueriable: linq.IEnumerable<IReplayTrackerEvent>;
        private _trackerQueriablePromise: Promise<linq.IEnumerable<IReplayTrackerEvent>>;
    
        private _unitTypeByTag: { [tag: number]: string } = {};
    
        public get trackerQueriable(): Promise<linq.IEnumerable<IReplayTrackerEvent>> {
            if (this._trackerQueriable) {
                return this.asPromise<linq.IEnumerable<IReplayTrackerEvent>>(this._trackerQueriable);
            }
            return this.getTrackerQueriable();
        }
    
    
        public constructor(private replay: Replay) {
    
        };
    
        public async getUnitTypes() {
            const protocol = await this.replay.protocol;
            let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerQueriable);
            q = q.where(e => isSUnitBornEvent(e));
            const result = q.toObject(e => protocol.unitTag(e.m_unitTagIndex, e.m_unitTagRecycle), e => e.m_unitTypeName);
            return result;
        }
    
        public async getMinionSpawns(team?: number) {
            const protocol = await this.replay.protocol;
            let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerQueriable)
                .where(
                e => isSUnitBornEvent(e) && (e.m_controlPlayerId === 11 || e.m_controlPlayerId === 12) && e.m_unitTypeName.endsWith('Minion')
                );
            if (team === 1) {
                q = q.where(e => e.m_controlPlayerId === 11);
            } else if (team === 2) {
                q = q.where(e => e.m_controlPlayerId === 12);
            }
            const result = q.select(e => ({
                tag: protocol.unitTag(e.m_unitTagIndex, e.m_unitTagRecycle),
                unitType: e.m_unitTypeName,
                time: e._gameloop / 16,
                x: e.m_x,
                y: e.m_y
            }));
    
    
            return result.toArray();//.groupBy(e => e.tag, e => e).toArray();
        }
    
    
        private async getTrackerQueriable(): Promise<linq.IEnumerable<IReplayTrackerEvent>> {
            const events = await this.replay.trackerEvents;
            return this._trackerQueriable = linq.from(events);
        }
        private asPromise<T>(value: T): Promise<T> {
            return new Promise((res, rej) => {
                res(value);
            });
        }
        */
}
