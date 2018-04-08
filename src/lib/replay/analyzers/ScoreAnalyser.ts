
import { ReplayAnalyserContext, RunOnWorker } from '../decorators';
import { Replay } from '../Replay';
import { IReplayTrackerEvent, isSScoreResultEvent, ISScoreResultEvent } from '../../types';
import * as linq from 'linq';

export interface IPlayerScores {
    "Takedowns": number;
    "Deaths": number;
    "SoloKill": number;
    "Assists": number;
    "ExperienceContribution": number;
    "Healing": number;
    "SiegeDamage": number;
    "HeroDamage": number;
    "DamageTaken": number;
    "Awards": string[];
}

@ReplayAnalyserContext('0B9EBC25-CB1F-47CC-B287-D806D58E2C55')
export class ScoreAnalyser {
    public constructor(private replay: Replay) { }

    private get trackerQueriable(): Promise<linq.IEnumerable<IReplayTrackerEvent>> {
        return (async (): Promise<linq.IEnumerable<IReplayTrackerEvent>> => {
            const events = await this.replay.trackerEvents;
            console.log(events);
            return linq.from(events);
        })();
    }


    @RunOnWorker()
    public get scoreScreenData(): Promise<IPlayerScores[]> {
        return (async (): Promise<any> => {
            const trackerQueriable = await this.trackerQueriable;
            const results = <ISScoreResultEvent><any>trackerQueriable.where(e => isSScoreResultEvent(e)).last();
            console.log('!!!!>>>', results)
            const scoreStats = [
                "Takedowns",
                "Deaths",
                "SoloKill",
                "Assists",
                "ExperienceContribution",
                "Healing",
                "SiegeDamage",
                "HeroDamage",
                "DamageTaken"
            ];
            const stats = linq.from(results.m_instanceList)
                .where(e => scoreStats.indexOf(e.m_name) !== -1)
                .toArray();

            const awards = linq.from(results.m_instanceList)
                .where(e => e.m_name.startsWith('EndOfMatchAward'))
                .toArray();

            const playerStats = [{ Awards: [] }, { Awards: [] }, { Awards: [] }, { Awards: [] }, { Awards: [] }, { Awards: [] }, { Awards: [] }, { Awards: [] }, { Awards: [] }, { Awards: [] }];
            for (let i = 0; i < playerStats.length; i++) {
                const pstats = playerStats[i];
                for (let j = 0; j < stats.length; j++) {
                    const stat = stats[j];
                    pstats[stat.m_name] = stat.m_values[i][0].m_value;
                }
                for (let j = 0; j < awards.length; j++) {
                    const award = awards[j];
                    const awardName = award.m_name.substring(0, award.m_name.length - 7).substring(15);
                    const value = award.m_values[i][0].m_value === 1;
                    if (value) {
                        pstats.Awards.push(awardName);
                    }
                }
            }

            return playerStats;
        })();
    }
}

