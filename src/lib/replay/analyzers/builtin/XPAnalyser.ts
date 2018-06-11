
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import {
    isPeriodicXPBreakdownSStatGameEvent, ISStatGameEvent,
    ISStatGameEventData, getSStatValue,
    isEndOfGameXPBreakdownSStatGameEvent,
    ISScoreResultEvent, isSScoreResultEvent,
    isSUnitBornEvent, isSUnitDiedEvent,
    ISUnitBornEvent, ISUnitDiedEvent
} from '../../../types';
import * as linq from 'linq';
import { PlayerAnalyser, IPlayerSlot } from './PlayerAnalyser';
import { ReplayAttributeHelper } from '../../util/ReplayAttributeHelper';
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { RequiredReplayVersion } from '../decorators';
import { ReplayVersionOutOfRangeError } from "../../errors";
// import { RequiredReplayVersion } from '../decorators';

export interface IPeriodicXP {
    team: number;
    teamLevel: number;
    time: number;
    previousTime: number;
    minionXP: number;
    creepXP: number;
    structureXP: number;
    heroXP: number;
    trickleXP: number;
}

@ReplayAnalyserContext('CDDD28FF-DAB2-4710-A28F-8D48DD6DE84F')
export class XPAnalyser extends AbstractReplayAnalyser {
    private playerAnalyser: PlayerAnalyser;
    public constructor(replay: Replay) {
        super(replay);
    }
    public async initialize(): Promise<void> {
        await super.initialize();
        this.playerAnalyser = new PlayerAnalyser(this.replay);
        await this.playerAnalyser.initialize();
    }

    private getStat<T>(from: ISStatGameEventData<T>[], key: string): T {
        if (from) {
            var r = linq.from(from).singleOrDefault(_ => _.m_key === key);
            if (r) {
                return r.m_value;
            }
        }
        return undefined;
    }

    @RunOnWorker()
    @RequiredReplayVersion(40336, 'Player xp data not supported by this version of replay')
    public get periodicXP(): Promise<IPeriodicXP[]> {
        return (async (): Promise<IPeriodicXP[]> => {
            const trackableQ = await this.trackerEventsQueriable;
            const players = await this.playerAnalyser.playerSlotData;
            const protocol = await this.replay.protocol;
            const tickRate = await this.tickRate;
            const result = trackableQ
                .where(_ => isPeriodicXPBreakdownSStatGameEvent(_))
                .select((_: ISStatGameEvent) => ({
                    team: getSStatValue(_.m_intData, 'Team') - 1,
                    teamLevel: getSStatValue(_.m_intData, 'TeamLevel'),
                    time: getSStatValue(_.m_fixedData, 'GameTime', true),
                    previousTime: getSStatValue(_.m_fixedData, 'PreviousGameTime', true),
                    minionXP: getSStatValue(_.m_fixedData, 'MinionXP', true),
                    creepXP: getSStatValue(_.m_fixedData, 'CreepXP', true),
                    structureXP: getSStatValue(_.m_fixedData, 'StructureXP', true),
                    heroXP: getSStatValue(_.m_fixedData, 'HeroXP', true),
                    trickleXP: getSStatValue(_.m_fixedData, 'TrickleXP', true)
                }))
                .toArray();

            const lvlResult = <ISScoreResultEvent><any>trackableQ.where(e => isSScoreResultEvent(e)).last();
            const levels = linq.from(lvlResult.m_instanceList)
                .where(l => l.m_name === 'Level')
                .selectMany(_ => _.m_values)
                .select((l, i) => ({
                    i: i,
                    l: l[0] ? l[0].m_value : undefined
                }))
                .where(r => r.i === 0 || r.i === 5)
                .select(_ => _.l)
                .toArray();

            const coreDeath = trackableQ.where(
                    _ => isSUnitBornEvent(_) && 
                    (_.m_unitTypeName === 'KingsCore' ||  _.m_unitTypeName === 'VanndarStormpike' || _.m_unitTypeName === 'DrekThar')
                )
                .join(
                    trackableQ.where(_ => isSUnitDiedEvent(_)),
                    (b: ISUnitBornEvent) => protocol.unitTag(b.m_unitTagIndex, b.m_unitTagRecycle),
                    (d: ISUnitDiedEvent) => protocol.unitTag(d.m_unitTagIndex, d.m_unitTagRecycle),
                    (b: ISUnitBornEvent, d: ISUnitDiedEvent) => d._gameloop
                ).first();

            const endOfGameResults = trackableQ
                .where(_ => isEndOfGameXPBreakdownSStatGameEvent(_))
                .select((_: ISStatGameEvent) => {
                    const playerIndex = getSStatValue(_.m_intData, 'PlayerID') - 1;
                    const player = players[playerIndex];
                    return {
                        team: player.team,
                        teamLevel: player.team == 0 ? levels[0] : levels[1],
                        time: coreDeath / tickRate,
                        previousTime: result[result.length - 1].time,
                        userId: getSStatValue(_.m_intData, 'PlayerID'),
                        minionXP: getSStatValue(_.m_fixedData, 'MinionXP', true),
                        creepXP: getSStatValue(_.m_fixedData, 'CreepXP', true),
                        structureXP: getSStatValue(_.m_fixedData, 'StructureXP', true),
                        heroXP: getSStatValue(_.m_fixedData, 'HeroXP', true),
                        trickleXP: getSStatValue(_.m_fixedData, 'TrickleXP', true),
                    }
                });

            result.push(endOfGameResults.first(_ => _.team === 0));
            result.push(endOfGameResults.first(_ => _.team === 1));
            return result;
        })();
    }


}

