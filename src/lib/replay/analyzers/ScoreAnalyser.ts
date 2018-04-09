
import { ReplayAnalyserContext, RunOnWorker } from '../decorators';
import { Replay } from '../Replay';
import { IReplayTrackerEvent, isSScoreResultEvent, ISScoreResultEvent } from '../../types';
import * as linq from 'linq';
import { BasicReplayAnalyser } from './BasicReplayAnalyser'

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

export interface IScoreScreenData {
    winningTeam: number;
    team1Level: number;
    team2Level: number;
    team1Kills: number;
    team2Kills: number;
    playerScores: IPlayerScores[];
}

@ReplayAnalyserContext('0B9EBC25-CB1F-47CC-B287-D806D58E2C55')
export class ScoreAnalyser {
    private basicReplayAnalyser: BasicReplayAnalyser;

    public constructor(private replay: Replay) { 
        this.basicReplayAnalyser = new BasicReplayAnalyser(replay);
    }
       

    private get trackerQueriable(): Promise<linq.IEnumerable<IReplayTrackerEvent>> {
        return (async (): Promise<linq.IEnumerable<IReplayTrackerEvent>> => {
            const events = await this.replay.trackerEvents;
            return linq.from(events);
        })();
    }

    @RunOnWorker()
    public get scoreScreenData(): Promise<IScoreScreenData> {
        return (async (): Promise<IScoreScreenData> => {
            const playerScores = await this.playerScoresSimple;
            const trackerQueriable = await this.trackerQueriable;
            const results = <ISScoreResultEvent><any>trackerQueriable.where(e => isSScoreResultEvent(e)).last();
            const takeDowns = linq.from(results.m_instanceList)
                .where(l => l.m_name === 'TeamTakedowns')
                .selectMany(l => l.m_values)
                .where(td => {
                    console.log('TeamTakedowns', td);
                    return td[0] && td[0].m_value !== 0
                })
                .select(td => td[0].m_value)
                .toArray();

            const levels = linq.from(results.m_instanceList)
                .where(l => l.m_name === 'Level')
                .selectMany(_ => _.m_values)
                .select((l, i) => ({
                    i: i,
                    l: l[0] ? l[0].m_value : undefined
                }))
                .where(r => r.i === 0 || r.i === 5)
                .select(_ => _.l)
                .toArray();

            // TODO: check to make sure teams kills are always reversed
            const scoreData: IScoreScreenData = {
                winningTeam: await this.basicReplayAnalyser.winningTeam,
                team1Kills: takeDowns[1],
                team2Kills: takeDowns[0],
                team1Level: levels[0],
                team2Level: levels[1],
                playerScores: playerScores
            };
            return scoreData;
        })();
    }

    @RunOnWorker()
    public get playerScoresSimple(): Promise<IPlayerScores[]> {
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

