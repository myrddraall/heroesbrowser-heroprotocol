import { Replay } from '../../Replay';
import { IReplayTrackerEvent, isSUnitBornEvent, ISUnitBornEvent, IReplayDetailsPlayer } from '../../../types';
import * as linq from 'linq';
import * as sha1 from 'sha1';
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
// tslint:disable:no-bitwise
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';

export interface IMapDescriptor {
    name: string;
    size: IPoint;
}

export interface IPoint {
    x: number;
    y: number;
}

@ReplayAnalyserContext('D90DC9EF-B016-47F1-984B-B9BA099869E6')
export class ReplayMapAnalyser extends AbstractReplayAnalyser {


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
            return {
                x: init.m_syncLobbyState.m_gameDescription.m_mapSizeX,
                y: init.m_syncLobbyState.m_gameDescription.m_mapSizeY
            };
        })();
    }

    @RunOnWorker()
    public get mapDescriptor(): Promise<IMapDescriptor> {
        return (async (): Promise<IMapDescriptor> => {
            return {
                name: await this.mapName,
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
}
