import { Replay } from '../../Replay';
import {
    IReplayTrackerEvent,
    isSUnitBornEvent,
    ISUnitBornEvent,
    IReplayDetailsPlayer,
    IPoint,
    isGameStartSStatGameEvent,
    ISStatGameEvent,
    getSStatValue,
    isSStatGameEvent,
    ISUnitDiedEvent,
    isSUnitDiedEvent,
    getSStatValueArray
} from '../../../types';
import * as linq from 'linq';
import * as sha1 from 'sha1';
import { ReplayAnalyserContext, RunOnWorker, WorkerOnly } from '../../decorators';
import { PlayerAnalyser, IPlayerSlot } from './PlayerAnalyser';
// tslint:disable:no-bitwise
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { compare } from 'semver';

export interface IUnitSpawn {
    id: number;
    type: string;
    spawnControlPlayerId: number;
    spawnX: number;
    spawnY: number;
    spawnTime: number;
    isHero: boolean;
    isHeroSummon: boolean;
}

export interface IUnitLife extends IUnitSpawn {
    killingUnitTag: number;
    killingUnitType: string;
    killingPlayerId: number;
    killingTeam: number;
    spawnPlayerId: number;
    spawnTeam: number;
    deathX: number;
    deathY: number;
    deathTime: number;
    killAssists: number[];
    isSelfKill: boolean;
    isSoloKill: boolean;
    isPlayerDeath: boolean;
}


interface IUnitLifeSpan {
    id: number;
    spawn: ISUnitBornEvent;
    death?: ISUnitDiedEvent;
}

@ReplayAnalyserContext('BB8A798F-C4BC-4806-B138-4E2512E4518A')
export class UnitAnalyser extends AbstractReplayAnalyser {
    private playerAnalyser: PlayerAnalyser;
    private static _unitTypesById: { [id: number]: string };
    private static _unitTypesPromise: Promise<{ [id: number]: string }>;

    private static _unitSpawnById: { [id: number]: ISUnitBornEvent };
    private static _unitSpawn: ISUnitBornEvent[];
    private static _unitSpawnPromise: Promise<{ [id: number]: ISUnitBornEvent }>;
    private static _playerSpawnById: { [id: number]: ISUnitBornEvent };
    private static _playerSpawn: ISUnitBornEvent[];

    private static _unitDeathById: { [id: number]: ISUnitDiedEvent };
    private static _unitDeath: ISUnitDiedEvent[];
    private static _unitDeathPromise: Promise<{ [id: number]: ISUnitDiedEvent }>;
    private static _playerDeathById: { [id: number]: ISUnitDiedEvent };
    private static _playerDeath: ISUnitDiedEvent[];

    private static _unitLifeSpanById: { [id: number]: IUnitLifeSpan };
    private static _unitLifeSpan: IUnitLifeSpan[];
    private static _unitLifeSpanPromise: Promise<{ [id: number]: IUnitLifeSpan }>;
    private static _playerLifeSpanById: { [id: number]: IUnitLifeSpan };
    private static _playerLifeSpan: IUnitLifeSpan[];
    private static _playerDeathAssistsById: { [id: number]: ISStatGameEvent };

    public constructor(replay: Replay) {
        super(replay);
    }

    public async initialize(): Promise<void> {
        await super.initialize();
        this.playerAnalyser = new PlayerAnalyser(this.replay);
        await this.playerAnalyser.initialize();

        /*
                let start = new Date().getTime();
                await this.buildUnitSpawns();
                console.log('built unit spawns in ', new Date().getTime() - start);
        
                start = new Date().getTime();
                await this.buildUnitDeaths();
                console.log('built unit deaths in ', new Date().getTime() - start);
        
                start = new Date().getTime();
                await this.buildUnitLifeSpans();
                console.log('built unit life spans in ', new Date().getTime() - start);
        
                start = new Date().getTime();
                await this.getMinionsKilledByPlayerCount(0);
                console.log('getMinionsKilledByPlayerCount 0 in ', new Date().getTime() - start);
        
                start = new Date().getTime();
                await this.getMinionsKilledByPlayerCount(1);
                console.log('getMinionsKilledByPlayerCount 1 in ', new Date().getTime() - start);
        
                start = new Date().getTime();
                await this.getMinionsKilledByPlayerCount(2);
                console.log('getMinionsKilledByPlayerCount 2 in ', new Date().getTime() - start);
        
                start = new Date().getTime();
                await this.getMinionsKilledByPlayerCount(3);
                console.log('getMinionsKilledByPlayerCount 3 in ', new Date().getTime() - start);
        
        
                start = new Date().getTime();
                await this.getMinionsKilledByPlayerCount(4);
                console.log('getMinionsKilledByPlayerCount 4 in ', new Date().getTime() - start);
        */
    }


    private buildUnitTypes(): Promise<{ [id: number]: string }> {
        if (!UnitAnalyser._unitTypesPromise) {
            UnitAnalyser._unitTypesPromise = (async () => {
                const protocol = await this.replay.protocol;
                let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerEventsQueriable);
                const result = <{ [id: number]: string }>q.where(_ => isSUnitBornEvent(_))
                    .toObject(_ => protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle), _ => _.m_unitTypeName);
                return UnitAnalyser._unitTypesById = result;
            })();
        }
        return UnitAnalyser._unitTypesPromise;
    }

    private get unitTypeById(): Promise<{ [id: number]: string }> {
        if (!UnitAnalyser._unitTypesPromise) {
            this.buildUnitTypes();
        }
        return UnitAnalyser._unitTypesPromise;
    }

    private buildUnitSpawns(): Promise<{ [id: number]: ISUnitBornEvent }> {
        if (!UnitAnalyser._unitSpawnPromise) {
            UnitAnalyser._unitSpawnPromise = (async () => {
                const protocol = await this.replay.protocol;
                const unitSpawnArr: ISUnitBornEvent[] = [];
                const playerSpawnArr: ISUnitBornEvent[] = [];
                const playerSpawnById: { [id: number]: ISUnitBornEvent } = {};
                let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerEventsQueriable);
                const result = <{ [id: number]: ISUnitBornEvent }>q.where(_ => isSUnitBornEvent(_))
                    .toObject(_ => protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle), _ => {
                        unitSpawnArr.push(_);
                        if (_.m_unitTypeName.startsWith('Hero')) {
                            const id = protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle);
                            playerSpawnArr.push(_);
                            playerSpawnById[id] = _;
                        }
                        return _;
                    });
                UnitAnalyser._unitSpawn = unitSpawnArr;
                UnitAnalyser._playerSpawn = playerSpawnArr;
                UnitAnalyser._playerSpawnById = playerSpawnById;
                return UnitAnalyser._unitSpawnById = result;
            })();
        }
        return UnitAnalyser._unitSpawnPromise;
    }


    private get unitSpawnById(): Promise<{ [id: number]: ISUnitBornEvent }> {
        return this.buildUnitSpawns();
    }

    private get unitSpawn(): Promise<ISUnitBornEvent[]> {
        return (async () => {
            UnitAnalyser._unitSpawnPromise ? await UnitAnalyser._unitSpawnPromise : await this.buildUnitSpawns();
            return UnitAnalyser._unitSpawn;
        })();
    }

    private get playerSpawn(): Promise<ISUnitBornEvent[]> {
        return (async () => {
            UnitAnalyser._unitSpawnPromise ? await UnitAnalyser._unitSpawnPromise : await this.buildUnitSpawns();
            return UnitAnalyser._playerSpawn;
        })();
    }

    private get playerSpawnById(): Promise<{ [id: number]: ISUnitBornEvent }> {
        return (async () => {
            UnitAnalyser._unitSpawnPromise ? await UnitAnalyser._unitSpawnPromise : await this.buildUnitSpawns();
            return UnitAnalyser._playerSpawnById;
        })();
    }

    private buildUnitDeaths(): Promise<{ [id: number]: ISUnitDiedEvent }> {
        if (!UnitAnalyser._unitDeathPromise) {
            UnitAnalyser._unitDeathPromise = (async () => {
                const protocol = await this.replay.protocol;
                const spawns = await this.unitSpawnById;
                const unitDeathArr: ISUnitDiedEvent[] = [];
                const playerDeathArr: ISUnitDiedEvent[] = [];
                const playerDeathById: { [id: number]: ISUnitDiedEvent } = {};
                let q = <linq.IEnumerable<ISUnitDiedEvent>>(await this.trackerEventsQueriable);
                const result = <{ [id: number]: ISUnitDiedEvent }>q.where(_ => isSUnitDiedEvent(_))
                    .toObject(_ => protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle), _ => {
                        const id = protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle);
                        const type = spawns[id].m_unitTypeName;
                        if (type.startsWith('Hero')) {
                            playerDeathArr.push(_);
                            playerDeathById[id] = _;
                        }
                        unitDeathArr.push(_);
                        return _;
                    });
                UnitAnalyser._unitDeath = unitDeathArr;
                UnitAnalyser._playerDeath = playerDeathArr;
                UnitAnalyser._playerDeathById = playerDeathById;
                return UnitAnalyser._unitDeathById = result;
            })();
        }
        return UnitAnalyser._unitDeathPromise;
    }


    private get unitDeathById(): Promise<{ [id: number]: ISUnitDiedEvent }> {
        return this.buildUnitDeaths();
    }

    private get unitDeath(): Promise<ISUnitDiedEvent[]> {
        return (async () => {
            UnitAnalyser._unitDeathPromise ? await UnitAnalyser._unitDeathPromise : await this.buildUnitDeaths();
            return UnitAnalyser._unitDeath;
        })();
    }

    private get playerDeathById(): Promise<{ [id: number]: ISUnitDiedEvent }> {
        return (async () => {
            UnitAnalyser._unitDeathPromise ? await UnitAnalyser._unitDeathPromise : await this.buildUnitDeaths();
            return UnitAnalyser._playerDeathById;
        })();
    }

    private get playerDeath(): Promise<ISUnitDiedEvent[]> {
        return (async () => {
            UnitAnalyser._unitDeathPromise ? await UnitAnalyser._unitDeathPromise : await this.buildUnitDeaths();
            return UnitAnalyser._playerDeath;
        })();
    }

    private buildUnitLifeSpans(): Promise<{ [id: number]: IUnitLifeSpan }> {
        if (!UnitAnalyser._unitLifeSpanPromise) {
            UnitAnalyser._unitLifeSpanPromise = (async () => {
                const protocol = await this.replay.protocol;
                let q = await this.trackerEventsQueriable;

                const playerDeathQ = <linq.IEnumerable<ISStatGameEvent>>linq.from(
                    q.where(
                        _ => isSStatGameEvent(_) &&
                            _.m_eventName === 'PlayerDeath'
                    ).toArray()
                );

                const lifeSpanArr: IUnitLifeSpan[] = [];
                const lifeSpanById: { [id: number]: IUnitLifeSpan } = {};

                const playerLifeSpanArr: IUnitLifeSpan[] = [];
                const playerLifeSpanById: { [id: number]: IUnitLifeSpan } = {};
                UnitAnalyser._playerDeathAssistsById = {};
                const spawns = await this.unitSpawn;
                const deathById = await this.unitDeathById;

                for (let i = 0; i < spawns.length; i++) {
                    const spawn = spawns[i];
                    const id = protocol.unitTag(spawn.m_unitTagIndex, spawn.m_unitTagRecycle);
                    const death = deathById[id];
                    const type = spawn.m_unitTypeName;
                    const lifeSpan: IUnitLifeSpan = {
                        id,
                        spawn,
                        death
                    };
                    lifeSpanArr.push(lifeSpan);
                    lifeSpanById[id] = lifeSpan;
                    if (type.startsWith('Hero')) {
                        playerLifeSpanArr.push(lifeSpan);
                        playerLifeSpanById[id] = lifeSpan;
                        if (death) {
                            const deathStatEvent = playerDeathQ
                                .where(_ =>
                                    getSStatValue(_.m_intData, 'PlayerID') === spawn.m_controlPlayerId && _._gameloop === death._gameloop + 1
                                )
                                .firstOrDefault();
                            if (deathStatEvent) {
                                UnitAnalyser._playerDeathAssistsById[id] = deathStatEvent;
                            }
                        }
                    }
                }
                UnitAnalyser._unitLifeSpanById = lifeSpanById;
                UnitAnalyser._unitLifeSpan = lifeSpanArr;
                UnitAnalyser._playerLifeSpan = playerLifeSpanArr;
                UnitAnalyser._playerLifeSpanById = playerLifeSpanById;
                return lifeSpanById;
            })();
        }
        return UnitAnalyser._unitLifeSpanPromise;
    }


    private get unitLifeSpanById(): Promise<{ [id: number]: IUnitLifeSpan }> {
        return this.buildUnitLifeSpans();
    }

    private get unitLifeSpan(): Promise<IUnitLifeSpan[]> {
        return (async () => {
            UnitAnalyser._unitLifeSpanPromise ? await UnitAnalyser._unitLifeSpanPromise : await this.buildUnitLifeSpans();
            return UnitAnalyser._unitLifeSpan;
        })();
    }

    private get playerLifeSpanById(): Promise<{ [id: number]: IUnitLifeSpan }> {
        return (async () => {
            UnitAnalyser._unitLifeSpanPromise ? await UnitAnalyser._unitLifeSpanPromise : await this.buildUnitLifeSpans();
            return UnitAnalyser._playerLifeSpanById;
        })();
    }

    private get playerLifeSpan(): Promise<IUnitLifeSpan[]> {
        return (async () => {
            UnitAnalyser._unitLifeSpanPromise ? await UnitAnalyser._unitLifeSpanPromise : await this.buildUnitLifeSpans();
            return UnitAnalyser._playerLifeSpan;
        })();
    }

    private get playerDeathAssistsById(): Promise<{ [id: number]: ISStatGameEvent }> {
        return (async () => {
            UnitAnalyser._unitLifeSpanPromise ? await UnitAnalyser._unitLifeSpanPromise : await this.buildUnitLifeSpans();
            return UnitAnalyser._playerDeathAssistsById;
        })();
    }


    protected async getMinionsKilledByPlayerQuery(playerIndex: number) {
        const lsQ = linq.from(await this.unitLifeSpan);
        return lsQ.where(_ =>
            (_.spawn.m_unitTypeName === 'RangedMinion' ||
                _.spawn.m_unitTypeName === 'FootmanMinion' ||
                _.spawn.m_unitTypeName === 'WizardMinion') &&
            _.death &&
            _.death.m_killerPlayerId === playerIndex + 1
        );
    }
    @RunOnWorker()
    public async getMinionsKilledByPlayer(playerIndex: number) {
        const killedByPlayerQuery = await this.getMinionsKilledByPlayerQuery(playerIndex);
        return killedByPlayerQuery.toArray();
    }

    @RunOnWorker()
    public async getMinionsKilledCountByPlayer(playerIndex: number) {
        return (await this.getMinionsKilledByPlayerQuery(playerIndex)).count();
    }
    @RunOnWorker()
    public async getPlayerSoloKills(playerIndex: number, ignoreNPCs = false): Promise<number> {
        const q = await this.trackerEventsQueriable;
        const soloCount = q.where(
            _ => {
                if (isSStatGameEvent(_) && _.m_eventName === 'PlayerDeath') {
                    const assists = getSStatValueArray(_.m_intData, 'KillingPlayer');
                    if(assists.length === 1 && assists[0] === playerIndex + 1){
                        return true;
                    }
                    if(ignoreNPCs){
                        const idx = assists.findIndex(assister => {
                            if(assister < 11 && assister !== playerIndex + 1){
                                return true;
                            }
                            return false;
                        });
                        if(idx === -1 && assists.indexOf(playerIndex + 1) !== -1){
                            return true;
                        }
                    }
                }
                return false;
            }
        ).count();
        return soloCount;
        /*const protocol = await this.replay.protocol;
        const assistEvents = await this.playerDeathAssistsById;
        const lives = linq.from(await this.playerLifeSpan);

        return lives.where(_ => {
            let match = _.death && _.death.m_killerPlayerId === playerIndex + 1;
            if(match){
                const id = protocol.unitTag(_.spawn.m_unitTagIndex, _.spawn.m_unitTagRecycle);
                const assistEvent = assistEvents[id];
                console.log(_.death.m_killerPlayerId, assistEvent.m_intData);
                if(!assistEvent){
                    match = false;
                }else{
                    var assistPlayers = getSStatValueArray(assistEvent.m_intData, 'KillingPlayer');
                    
                    if(assistPlayers.length > 1){
                        match = false;
                    }
                }
            }
            return match;
        }).count(); */
    }

}
