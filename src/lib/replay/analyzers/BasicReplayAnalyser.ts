import { Replay } from '../Replay';
//import { IReplayTrackerEvent, isSUnitBornEvent, ISUnitBornEvent } from '../types';
import * as linq from 'linq';
import * as sha1 from 'sha1';
import { IReplayDetailsPlayer } from '../../types';
import { ReplayAnalyserContext, RunOnWorker } from '../decorators';
// tslint:disable:no-bitwise


export enum GameType {
    UNKNOWN = 0,
    FLAG_SOLO_QUEUE = 1,
    FLAG_COOP = 1 << 1,
    FLAG_PVP = 1 << 2,
    FLAG_DRAFT = 1 << 3,
    FLAG_RANKED = 1 << 4,
    MODE_PRACTICE = 1 << 5,
    MODE_AI = 1 << 6,
    MODE_BRAWL = 1 << 7,
    MODE_QM = 1 << 8,
    MODE_UR = 1 << 9,
    MODE_HL = 1 << 10,
    MODE_TL = 1 << 11,
    MODE_CUSTOM = 1 << 12,

    PRACTICE = MODE_PRACTICE | FLAG_SOLO_QUEUE,
    SOLO_AI = MODE_AI | FLAG_SOLO_QUEUE,
    COOP_AI = MODE_AI | FLAG_COOP,
    CUSTOM = MODE_CUSTOM | FLAG_PVP,
    CUSTOM_DRAFT = MODE_CUSTOM | FLAG_PVP | FLAG_DRAFT,
    BRAWL = MODE_BRAWL | FLAG_PVP,
    QUICK_MATCH = MODE_QM | FLAG_PVP,
    UNRANKED_DRAFT = MODE_UR | FLAG_PVP | FLAG_DRAFT,
    HERO_LEAGUE = MODE_HL | FLAG_PVP | FLAG_DRAFT | FLAG_RANKED | FLAG_SOLO_QUEUE,
    TEAM_LEAGUE = MODE_TL | FLAG_PVP | FLAG_DRAFT | FLAG_RANKED
}

export interface ReplayDescription {
    fingerPrint: string;
    mapName: string;
    gameDurationTicks: number;
    gameDuration: number;
    version: { major: number, minor: number, revision: number, build: number, protocol: number };
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
export class BasicReplayAnalyser {


    public constructor(private replay: Replay) { }


    @RunOnWorker()
    public get fingerPrint(): Promise<string> {
        return (async (): Promise<string> => {
            let fp = '';
            const head = await this.replay.header;
            const init = await this.replay.initData;
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
            const head = await this.replay.header;
            return head.m_elapsedGameLoops;
        })();
    }

    public get gameDuration(): Promise<number> {
        return (async (): Promise<number> => {
            return (await this.gameDurationTicks) / 16;
        })();
    }

    @RunOnWorker()
    public get version(): Promise<{ major: number, minor: number, revision: number, build: number, protocol: number }> {
        return (async (): Promise<any> => {
            const head = await this.replay.header;
            return {
                protocol: head.m_version.m_baseBuild,
                build: head.m_version.m_build,
                major: head.m_version.m_major,
                minor: head.m_version.m_minor,
                revision: head.m_version.m_revision
            };
        })();
    }

    @RunOnWorker()
    public get gameType(): Promise<GameType> {
        return (async (): Promise<GameType> => {
            const init = await this.replay.initData;

            const gameDesc = init.m_syncLobbyState.m_gameDescription;
            console.log(gameDesc.m_gameOptions);
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
        })();
    }

    public isGameType(type: GameType): Promise<boolean> {
        return (async (): Promise<boolean> => {
            const gameType = await this.gameType;
            return (gameType & type) === type;
        })();
    }


    @RunOnWorker()
    public get mapName(): Promise<string> {
        return (async (): Promise<string> => {
            const head = await this.replay.header;
            const init = await this.replay.initData;
            const details = await this.replay.details;
            console.log(head);
            console.log(init);
            console.log(details);
            return details.m_title;
        })();
    }

    @RunOnWorker()
    public get winningTeam(): Promise<number> {
        return (async (): Promise<number> => {
            const details = await this.replay.details;
            return details.m_playerList[0].m_teamId === 0 && details.m_playerList[0].m_result === 1 ? 0 : 1;
        })();
    }

    @RunOnWorker()
    public get timeZone(): Promise<number> {
        return (async (): Promise<number> => {
            const details = await this.replay.details;
            return details.m_timeLocalOffset / 10000000 / 60 / 60;
        })();
    }

    @RunOnWorker()
    public get playedOn(): Promise<Date> {
        return (async (): Promise<Date> => {
            const details = await this.replay.details;
            return new Date(details.m_timeUTC / 10000 - 11644473600000);
        })();
    }

    @RunOnWorker()
    public get playerList(): Promise<BasicPlayerData[]> {
        return (async (): Promise<BasicPlayerData[]> => {
            const init = await this.replay.initData;

            const details = await this.replay.details;

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
