
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import {
    isPeriodicXPBreakdownSStatGameEvent, ISStatGameEvent,
    ISStatGameEventData, getSStatValue,
    isEndOfGameXPBreakdownSStatGameEvent,
    ISScoreResultEvent, isSScoreResultEvent
} from '../../../types';
import * as linq from 'linq';
import { PlayerAnalyser, IPlayerSlot } from './PlayerAnalyser';
import { ReplayAttributeHelper } from '../../util/ReplayAttributeHelper';
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';

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
    public get periodicXP(): Promise<IPeriodicXP[]> {
        return (async (): Promise<IPeriodicXP[]> => {
            const trackableQ = await this.trackerEventsQueriable;
            const playerQ = linq.from(await this.playerAnalyser.playerSlotData);

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

            const endOfGameResults = trackableQ
                .where(_ => isEndOfGameXPBreakdownSStatGameEvent(_))
                .select((_: ISStatGameEvent) => ({
                    time: _._gameloop / tickRate,
                    userId: getSStatValue(_.m_intData, 'PlayerID'),
                    minionXP: getSStatValue(_.m_fixedData, 'MinionXP', true),
                    creepXP: getSStatValue(_.m_fixedData, 'CreepXP', true),
                    structureXP: getSStatValue(_.m_fixedData, 'StructureXP', true),
                    heroXP: getSStatValue(_.m_fixedData, 'HeroXP', true),
                    trickleXP: getSStatValue(_.m_fixedData, 'TrickleXP', true),

                }))
                .join(
                    playerQ,
                    xp => xp.userId - 1,
                    p => p.userId,
                    (xp, player) => {
                        return Object.assign({}, xp, {
                            team: player.team,
                            teamLevel: player.team == 0 ? levels[0] : levels[1],
                            previousTime: result[result.length - 1].time
                        })
                    }
                )
                .groupBy(_ => _.team)
                .select(_ => _.first())
                .toArray();


            result.push(endOfGameResults[0]);
            result.push(endOfGameResults[1]);

            console.log('---', result);
            console.log('@@@@@@@', endOfGameResults);
            return result;
        })();
    }


}

