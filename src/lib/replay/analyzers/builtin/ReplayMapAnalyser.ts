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
    isSUnitDiedEvent
} from '../../../types';
import * as linq from 'linq';
import * as sha1 from 'sha1';
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { PlayerAnalyser, IPlayerSlot } from './PlayerAnalyser';
// tslint:disable:no-bitwise
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { IUnitSpawn, IUnitLife } from './UnitAnalyser';
import { UnitTypeGroups } from '../types';

export interface IMapDescriptor {
    name: string;
    build: number;
    size: IPoint;
}
/*
export interface IUnitSpawn {
    id: number;
    type: string;
    spawnControlPlayerId: number;
    spawnX: number;
    spawnY: number;
    spawnTime: number;
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
}
*/
export interface IMapPOI extends IPoint {
    type: string;
    team: number;
}

export interface IUnitLifeFilter {
    killedByPlayers?: number[] | boolean;
    killedByMinions?: boolean;
    killedByTeams?: number | number[];
    isOnTeam?: number | number[];
    isOwnedByPlayers?: number[] | boolean;
}


@ReplayAnalyserContext('D90DC9EF-B016-47F1-984B-B9BA099869E6')
export class ReplayMapAnalyser extends AbstractReplayAnalyser {
    private _unitTypesByTag: { [tag: number]: IUnitSpawn };
    private _unitTypes: IUnitSpawn[];
    private playerAnalyser: PlayerAnalyser;

    public constructor(replay: Replay) {
        super(replay);
    }

    public async initialize(): Promise<void> {
        await super.initialize();
        this.playerAnalyser = new PlayerAnalyser(this.replay);
        await this.playerAnalyser.initialize();
    }

    @RunOnWorker()
    public get mapName(): Promise<string> {
        return (async (): Promise<string> => {
            const details = await this.details;
            return details.m_title;
        })();
    }


    @RunOnWorker()
    public get mapSize(): Promise<IPoint> {
        return (async (): Promise<IPoint> => {
            const init = await this.initData;
            const trackerQ = await this.trackerEventsQueriable;
            return trackerQ.where(_ => isGameStartSStatGameEvent(_)).select((_: ISStatGameEvent) => ({
                x: getSStatValue(_.m_fixedData, 'MapSizeX', true),
                y: getSStatValue(_.m_fixedData, 'MapSizeY', true)
            })).first();
        })();
    }

    @RunOnWorker()
    public get mapDescriptor(): Promise<IMapDescriptor> {
        return (async (): Promise<IMapDescriptor> => {
            return {
                name: await this.mapName,
                build: this.protocolVersion,
                size: await this.mapSize
            };
        })();
    }

    @RunOnWorker()
    public async getMinionSpawns(team?: number) {
        const protocol = await this.replay.protocol;
        let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerEventsQueriable)
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
            team: e.m_controlPlayerId === 11 ? 1 : 2,
            x: e.m_x,
            y: e.m_y
        })).toArray();
        return result;
    }

    @RunOnWorker()
    public async getMercSpawns() {
        const protocol = await this.replay.protocol;
        let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerEventsQueriable)
            .where(
                e => isSUnitBornEvent(e)
                    && (e.m_unitTypeName.startsWith('King') || e.m_unitTypeName.startsWith('Town') || e.m_unitTypeName.startsWith('Underworld'))
            );

        const result = q.select(e => ({
            tag: protocol.unitTag(e.m_unitTagIndex, e.m_unitTagRecycle),
            unitType: e.m_unitTypeName,
            time: e._gameloop / 16,
            x: e.m_x,
            y: e.m_y
        }));
        return result.toArray();
    }

    @RunOnWorker()
    public async getMinionSpawnHeatmap(team?: number) {
        const protocol = await this.replay.protocol;
        let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerEventsQueriable)
            .where(
                e => isSUnitBornEvent(e) //&& (e.m_controlPlayerId === 11 || e.m_controlPlayerId === 12) // && e.m_unitTypeName.endsWith('Minion')
            );
        if (team === 1) {
            q = q.where(e => e.m_controlPlayerId === 11);
        } else if (team === 2) {
            q = q.where(e => e.m_controlPlayerId === 12);
        }

        const result = q.groupBy(i => `${i.m_x},${i.m_y}`)
            .select(g => ({
                value: g.count(),
                x: g.first().m_x,
                y: g.first().m_y
            }));

        return result.toArray();
    }


    public async genUnitTypes() {
        if (!this._unitTypesByTag) {
            const protocol = await this.replay.protocol;
            this._unitTypesByTag = {};
            let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerEventsQueriable);
            const result = q.where(_ => isSUnitBornEvent(_))
                .select(_ => (<IUnitSpawn>{
                    id: protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle),
                    type: _.m_unitTypeName,
                    spawnControlPlayerId: _.m_controlPlayerId,
                    spawnX: _.m_x,
                    spawnY: _.m_y,
                    spawnTime: _._gameloop
                }));
            this._unitTypesByTag = <{ [tag: number]: IUnitSpawn }>result.toObject(_ => _.id, _ => _);
            this._unitTypes = result.toArray()
        }
    }
    private async getUnitDeaths(filterPredicate): Promise<IUnitLife[]> {
        return (await this.getUnitDeathsQuery(filterPredicate)).toArray();
    }

    private async getUnitDeathsQuery(filterPredicate): Promise<linq.IEnumerable<IUnitLife>> {
        await this.genUnitTypes();
        const players = await this.playerAnalyser.playerSlotData;
        const protocol = await this.replay.protocol;
        let q = await this.trackerEventsQueriable;
        let query = q.where(_ => isSUnitDiedEvent(_)).join(
            linq.from(this._unitTypes),
            (died: ISUnitDiedEvent) => protocol.unitTag(died.m_unitTagIndex, died.m_unitTagRecycle),
            born => born.id,
            (died: ISUnitDiedEvent, born) => {
                const killPlayerIdx = died.m_killerPlayerId ? died.m_killerPlayerId - 1 : null;
                const killingUnitId = died.m_killerUnitTagIndex ? protocol.unitTag(died.m_killerUnitTagIndex, died.m_killerUnitTagRecycle) : null;
                let killingPlayer = null;
                let killingTeam = null;

                let killingUnit: IUnitSpawn = null;
                if (killPlayerIdx !== null) {
                    if (killPlayerIdx < 10) {
                        killingPlayer = players[killPlayerIdx];
                        killingTeam = killingPlayer.team;
                    } else if (killPlayerIdx === 10) {
                        killingTeam = 0;
                    } else if (killPlayerIdx === 11) {
                        killingTeam = 1;
                    } else {
                        console.log('UNKNOWN kill index:', killPlayerIdx, died, born.type)
                    }
                } else {
                    console.log('NULL kill index:', died, born.type)
                }

                if (killingUnitId != null) {
                    killingUnit = this._unitTypesByTag[killingUnitId];
                }

                const spawnPlayerIdx = born.spawnControlPlayerId ? born.spawnControlPlayerId - 1 : null;
                let spawnPlayer = null;
                let spawnTeam = null;

                if (spawnPlayerIdx !== null) {
                    if (spawnPlayerIdx < 10) {
                        spawnPlayer = players[spawnPlayerIdx];
                        spawnTeam = spawnPlayer.team;
                    } else if (spawnPlayerIdx === 10) {
                        spawnTeam = 0;
                    } else if (spawnPlayerIdx === 11) {
                        spawnTeam = 1;
                    } else {
                        console.log('UNKNOWN spawn control index:', spawnPlayerIdx, died, born.type)
                    }
                }
                return <IUnitLife>Object.assign({}, born, {
                    killingPlayerId: killPlayerIdx,
                    killingUnitTag: killingUnitId,
                    killingUnitType: killingUnit ? killingUnit.type : null,
                    killingTeam: killingTeam,
                    spawnTeam: spawnTeam,
                    spawnPlayerId: spawnPlayerIdx,
                    deathX: died.m_x,
                    deathY: died.m_y,
                    deathTime: died._gameloop
                })
            });
        if (filterPredicate) {
            query = query.where(filterPredicate);
        }
        return query;
    }

    private checkUnitLifeFilter(unit: IUnitLife, filter: IUnitLifeFilter): boolean {
        if (!filter) {
            return true;
        }
        if (filter.killedByPlayers === true && unit.killingPlayerId > 9) {
            return false;
        }
        if (Array.isArray(filter.killedByPlayers) && filter.killedByPlayers.indexOf(unit.killingPlayerId) === -1) {
            return false;
        }
        if (unit.killingUnitType === 'RangedMinion' || unit.killingUnitType === 'FootmanMinion' || unit.killingUnitType === 'WizardMinion') {
            if (filter.killedByMinions === false) {
                return false;
            }
        } else {
            if (filter.killedByMinions === true) {
                return false;
            }
        }
        if (filter.killedByTeams !== undefined) {
            if (!Array.isArray(filter.killedByTeams)) {
                filter.killedByTeams = [filter.killedByTeams];
            }
            if (filter.killedByTeams.indexOf(unit.killingTeam) === -1) {
                return false;
            }
        }

        if (filter.isOnTeam !== undefined) {
            if (!Array.isArray(filter.isOnTeam)) {
                filter.isOnTeam = [filter.isOnTeam];
            }
            if (filter.isOnTeam.indexOf(unit.spawnTeam) === -1) {
                return false;
            }
        }

        if (filter.isOwnedByPlayers === true && unit.spawnPlayerId > 9) {
            return false;
        }

        if (Array.isArray(filter.isOwnedByPlayers) && filter.isOwnedByPlayers.indexOf(unit.spawnPlayerId) === -1) {
            return false;
        }

        return true;
    }

    @RunOnWorker()
    public async getMinionDeaths(filter?: IUnitLifeFilter) {
        return await this.getUnitDeaths((_: IUnitLife) => {
            if (!(_.type === 'RangedMinion' || _.type === 'FootmanMinion' || _.type === 'WizardMinion')) {
                return false;
            }
            return this.checkUnitLifeFilter(_, filter);
        });
    }

    @RunOnWorker()
    public async getGlobeDeaths() {
        const trackerQ = await this.trackerEventsQueriable;
        const q = await this.getUnitDeathsQuery((_: IUnitLife) =>
            _.type === 'RegenGlobe' ||
            _.type === 'RegenGlobeNeutral'
        );
        const globesQ = q.groupBy(_ => {
            if (_.type === 'RegenGlobe') {
                return JSON.stringify({
                    x: _.deathX,
                    y: _.deathY,
                    time: _.deathTime,
                    control: _.spawnControlPlayerId
                });
            }
            return JSON.stringify({
                x: _.spawnX,
                y: _.spawnY,
                time: _.spawnTime,
                control: _.spawnControlPlayerId
            });
        }, _ => _, (key, _) => {
            const spawn = _.first();
            const neutral = _.last();
            const globe = {
                type: 'globe',
                x: spawn.spawnX,
                y: spawn.spawnY,
                spawnTime: spawn.spawnTime,
                deathTime: neutral.deathTime,
                lifeDuration: (neutral.deathTime - spawn.spawnTime) / 16,
                lifeDurationTicks: (neutral.deathTime - spawn.spawnTime),
                neutral: _.count() > 1,
                stolen: neutral.spawnControlPlayerId !== neutral.killingPlayerId,
                team: neutral.killingPlayerId === 11 ? 0 : 1
            }
            return globe;
        });

        const pickupQ = trackerQ.where(_ => isSStatGameEvent(_) && _.m_eventName === 'RegenGlobePickedUp')
            .select((_: ISStatGameEvent) => ({
                type: 'Pickup',
                deathTime: _._gameloop,
                playerId: getSStatValue(_.m_intData, 'PlayerID')
            }));


        const merged = linq.from([...globesQ.toArray(), ...pickupQ.toArray()]).orderBy(_ => _.deathTime).toArray();
        //groupBy<TKey, TElement, TResult, TCompare>(keySelector: (element: T) => TKey, elementSelector: (element: T) => TElement, resultSelector: (key: TKey, element: IEnumerable<TElement>) => TResult, compareSelector: (element: T) => TCompare): IEnumerable<TResult>;
        return merged;
    }

    @RunOnWorker()
    public async getMinionDeathHeatmap(filter?: IUnitLifeFilter) {
        const minionDeaths = linq.from(await this.getMinionDeaths(filter));
        const result = minionDeaths.groupBy(_ => `${_.deathX},${_.deathY}`)
            .select(g => ({
                value: g.count(),
                x: g.first().deathX,
                y: g.first().deathY
            }));

        return result.toArray();
    }


    @RunOnWorker()
    public async getPointsOfInterest(): Promise<IMapPOI[]> {
        const trackerQ = await this.trackerEventsQueriable;

        let cores = trackerQ
            .where(e => isSUnitBornEvent(e) && UnitTypeGroups.CORE.matches(e.m_unitTypeName))
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1,
                type: 'Core'
            }));

        let wells = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName.startsWith('TownMoonwell'))
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1,
                type: 'MoonWell'
            }));

        let towers = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName.startsWith('TownCannonTower'))
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1,
                type: 'Tower'
            }));

        let towns = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName.startsWith('TownTownHall'))
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1,
                type: 'Town'
            }));

        let watchTowers = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName.endsWith('WatchTower'))
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 2,
                type: 'WatchTower'
            }));

        let camps = trackerQ
            .where(e => isSStatGameEvent(e) && e.m_eventName === 'JungleCampInit')
            .select((_: ISStatGameEvent): IMapPOI => ({
                x: getSStatValue(_.m_fixedData, 'PositionX', true),
                y: getSStatValue(_.m_fixedData, 'PositionY', true),
                team: 2,
                type: 'JungleCamp'
            }));


        const mapSpecificPOIs = await this.getMapSpecificPOIs();

        return cores.merge(wells, towers, towns, watchTowers, camps, ...mapSpecificPOIs).toArray();
    }

    private async getMapSpecificPOIs(): Promise<linq.IEnumerable<IMapPOI>[]> {
        const mapName = await this.mapName;
        switch (mapName) {
            case 'Alterac Pass':
                return await this.getAlteracPassPOIs();
            case 'Battlefield of Eternity':
                return await this.getBattlefiledOfEternityPOIs();
            case 'Blackheart\'s Bay':
                return await this.getBlackheartsBayPOIs();
            case 'Cursed Hollow':
                return await this.getCursedHollowPOIs();
            case 'Haunted Mines':
                return await this.getHauntedMinesPOIs();
        }
        return [];
    }

    private async getAlteracPassPOIs(): Promise<linq.IEnumerable<IMapPOI>[]> {
        const result: linq.IEnumerable<IMapPOI>[] = [];
        const trackerQ = await this.trackerEventsQueriable;
        let immortals = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'Storm_Building_WCAV_Horde_CaptureCage' || e.m_unitTypeName === 'Storm_Building_WCAV_Alliance_CaptureCage'))
            .distinct((_: ISUnitBornEvent) => _.m_x * 1000 + _.m_y)
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 3,
                type: 'AP_Prison'
            }));
        result.push(immortals);
        return result;
    }

    private async getBattlefiledOfEternityPOIs(): Promise<linq.IEnumerable<IMapPOI>[]> {
        const result: linq.IEnumerable<IMapPOI>[] = [];
        const trackerQ = await this.trackerEventsQueriable;
        let immortals = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'BossDuelBossHeaven' || e.m_unitTypeName === 'BossDuelBossHell'))
            .distinct((_: ISUnitBornEvent) => _.m_x * 1000 + _.m_y)
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 3,
                type: 'BoE_Immortal'
            }));
        result.push(immortals);
        return result;
    }

    private async getBlackheartsBayPOIs(): Promise<linq.IEnumerable<IMapPOI>[]> {
        const result: linq.IEnumerable<IMapPOI>[] = [];
        const trackerQ = await this.trackerEventsQueriable;
        let chests = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'DocksTreasureChest'))
            .distinct((_: ISUnitBornEvent) => _.m_x * 1000 + _.m_y)
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 3,
                type: 'BHB_TreasureChest'
            }));
        result.push(chests);

        let turnin = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'GhostShipBeacon'))
            .distinct((_: ISUnitBornEvent) => _.m_x * 1000 + _.m_y)
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 3,
                type: 'BHB_Blackheart'
            }));
        result.push(turnin);

        return result;
    }

    private async getCursedHollowPOIs(): Promise<linq.IEnumerable<IMapPOI>[]> {
        const result: linq.IEnumerable<IMapPOI>[] = [];
        const trackerQ = await this.trackerEventsQueriable;
        let trib = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'RavenLordTribute'))
            .distinct((_: ISUnitBornEvent) => _.m_x * 1000 + _.m_y)
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 3,
                type: 'CH_Tribute'
            }));
        result.push(trib);
        return result;
    }
    private async getHauntedMinesPOIs(): Promise<linq.IEnumerable<IMapPOI>[]> {
        const result: linq.IEnumerable<IMapPOI>[] = [];
        const trackerQ = await this.trackerEventsQueriable;
        let mineEntrances = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'HoleLadderDown' || e.m_unitTypeName === 'HoleLadderUp'))
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 2,
                type: 'HM_MineEntrance'
            }));
        result.push(mineEntrances);

        let underworldBoss = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'UnderworldBoss'))
            .distinct((_: ISUnitBornEvent) => _.m_unitTypeName)
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: 3,
                type: 'HM_UnderworldBoss'
            }));
        result.push(underworldBoss);

        let underworldBossSummon = trackerQ
            .where(e => isSUnitBornEvent(e) && (e.m_unitTypeName === 'UnderworldSummonedBoss'))
            .distinct((_: ISUnitBornEvent) => _.m_x * 1000 + _.m_y)
            .select((_: ISUnitBornEvent): IMapPOI => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1,
                type: 'HM_UnderworldBoss'
            }));
        result.push(underworldBossSummon);
        return result;
    }

    @RunOnWorker()
    public async getMajorLocations() {

        const trackerQ = await this.trackerEventsQueriable;
        let cores = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName === 'KingsCore')
            .select((_: ISUnitBornEvent) => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1
            })).toArray();

        let wells = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName.startsWith('TownMoonwell'))
            .select((_: ISUnitBornEvent) => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1
            })).toArray();

        let towers = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName.startsWith('TownCannonTower'))
            .select((_: ISUnitBornEvent) => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1
            })).toArray();


        let towns = trackerQ
            .where(e => isSUnitBornEvent(e) && e.m_unitTypeName.startsWith('TownTownHall'))
            .select((_: ISUnitBornEvent) => ({
                x: _.m_x,
                y: _.m_y,
                team: _.m_controlPlayerId === 11 ? 0 : 1
            })).toArray();

        return {
            cores,
            wells,
            towers,
            towns
        };
    }
}
