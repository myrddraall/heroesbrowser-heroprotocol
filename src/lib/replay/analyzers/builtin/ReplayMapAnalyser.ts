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
// tslint:disable:no-bitwise
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';

export interface IMapDescriptor {
    name: string;
    build: number;
    size: IPoint;
}

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
    killingPlayerId: number;
    deathX: number;
    deathY: number;
    deathTime: number;
}


@ReplayAnalyserContext('D90DC9EF-B016-47F1-984B-B9BA099869E6')
export class ReplayMapAnalyser extends AbstractReplayAnalyser {
    private _unitTypesByTag: { [tag: number]: IUnitSpawn };
    private _unitTypes: IUnitSpawn[];

    public constructor(replay: Replay) {
        super(replay);
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

  
    public async getUnitDeaths(filterPredicate):Promise<IUnitLife[]> {
        await this.genUnitTypes();
        const protocol = await this.replay.protocol;
        let q = await this.trackerEventsQueriable;
        let query = q.where(_ => isSUnitDiedEvent(_)).join(
            linq.from(this._unitTypes),
            (died:ISUnitDiedEvent) => protocol.unitTag(died.m_unitTagIndex, died.m_unitTagRecycle),
            born => born.id,
            (died:ISUnitDiedEvent, born) =><IUnitLife>Object.assign({}, born, {
                killingPlayerId: died.m_killerPlayerId,
                killingUnitTag: died.m_killerUnitTagIndex ? protocol.unitTag(died.m_killerUnitTagIndex, died.m_killerUnitTagRecycle) : null,
                deathX: died.m_x,
                deathY: died.m_y,
                deathTime: died._gameloop
            })
        );
        if(filterPredicate){
            query = query.where(filterPredicate);
        }
        return query.toArray();
    }

    @RunOnWorker()
    public async getMinionDeaths() {
        return await this.getUnitDeaths((_:IUnitLife) => 
            _.type === 'RangedMinion' ||
            _.type === 'FootmanMinion' ||
            _.type === 'WizardMinion'
        );
    }

    @RunOnWorker()
    public async getMinionDeathHeatmap() {
        const minionDeaths = linq.from(await this.getMinionDeaths());
        const result = minionDeaths.groupBy(_ => `${_.deathX},${_.deathY}`)
        .select(g => ({
            value: g.count(),
            x: g.first().deathX,
            y: g.first().deathY
        }));

    return result.toArray();
    }

    @RunOnWorker()
    public async getMajorLocations() {
        const protocol = await this.replay.protocol;
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
