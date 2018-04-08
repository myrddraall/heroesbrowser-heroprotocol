import { Replay } from '../Replay';
import { IReplayTrackerEvent, isSUnitBornEvent, ISUnitBornEvent } from '../../types';
import * as linq from 'linq';
import * as sha1 from 'sha1';
import { IReplayDetailsPlayer } from '../../types';
import { ReplayAnalyserContext, RunOnWorker } from '../decorators';
// tslint:disable:no-bitwise

export interface IMapDescriptor {
    name: string;
    size: IPoint;
}

export interface IPoint {
    x: number;
    y: number;
}

@ReplayAnalyserContext('D90DC9EF-B016-47F1-984B-B9BA099869E6')
export class ReplayMapAnalyser {


    public constructor(private replay: Replay) { }


    private get trackerQueriable(): Promise<linq.IEnumerable<IReplayTrackerEvent>> {
        return (async (): Promise<linq.IEnumerable<IReplayTrackerEvent>> => {
            const events = await this.replay.trackerEvents;
            console.log(events);
            return linq.from(events);
        })();
    }

    @RunOnWorker()
    public get mapName(): Promise<string> {
        return (async (): Promise<string> => {
            const details = await this.replay.details;
            return details.m_title;
        })();
    }


    @RunOnWorker()
    public get mapSize(): Promise<IPoint> {
        return (async (): Promise<IPoint> => {
            const init = await this.replay.initData;
            console.log('init', init);
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
            team: e.m_controlPlayerId === 11 ? 1 : 2,
            x: e.m_x,
            y: e.m_y
        })).toArray();
        return result;
    }

    @RunOnWorker()
    public async getMercSpawns() {
        const protocol = await this.replay.protocol;
        let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerQueriable)
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
        console.log('MIN X', result.min(e => e.x));
        console.log('MAX X', result.max(e => e.x));
        console.log('MIN Y', result.min(e => e.y));
        console.log('MAX Y', result.max(e => e.y));

        return result.toArray();
    }

    @RunOnWorker()
    public async getMinionSpawnHeatmap(team?: number) {
        const protocol = await this.replay.protocol;
        let q = <linq.IEnumerable<ISUnitBornEvent>>(await this.trackerQueriable)
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
