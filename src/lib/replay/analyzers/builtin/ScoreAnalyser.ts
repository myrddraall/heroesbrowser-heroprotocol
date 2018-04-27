
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import { IReplayTrackerEvent, isSScoreResultEvent, ISScoreResultEvent } from '../../../types';
import * as linq from 'linq';
import { BasicReplayAnalyser } from './BasicReplayAnalyser'
import { ReplayVersionOutOfRangeError } from "../../errors";
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { RequiredReplayVersion } from '../decorators';



export interface ISimplePlayerScoreStats {
    "Takedowns": number;
    "Deaths": number;
    "SoloKill": number;
    "Assists": number;
    "ExperienceContribution": number;
    "Healing": number;
    "SiegeDamage": number;
    "HeroDamage": number;
    "DamageTaken": number;
    "TeamLevel": number;
}

export interface ISimplePlayerScore {
    hero: string;
    name: string;
    team: number;
    won: boolean;
    hasChatSilence: boolean;
    hasVoiceSilence: boolean;
    stats:ISimplePlayerScoreStats;
    awards: string[];
}


export interface IScoreScreenData {
    winningTeam: number;
    team1Level: number;
    team2Level: number;
    team1Kills: number;
    team2Kills: number;
    playerScores: ISimplePlayerScore[];
}

@ReplayAnalyserContext('0B9EBC25-CB1F-47CC-B287-D806D58E2C55')
export class ScoreAnalyser extends AbstractReplayAnalyser {
    private basicReplayAnalyser: BasicReplayAnalyser;

    public constructor(replay: Replay) {
        super(replay);
    }

    public async initialize(): Promise<void> {
        await super.initialize();
        this.basicReplayAnalyser = new BasicReplayAnalyser(this.replay);
        await this.basicReplayAnalyser.initialize();
    }

    @RunOnWorker()
    @RequiredReplayVersion(40336, 'Scorescreen Data not supported by this version of replay')
    public get scoreScreenData(): Promise<IScoreScreenData> {
        return (async (): Promise<IScoreScreenData> => {
            const playerScores = await this.playerScoresSimple;
            
            const playerScoresQ = linq.from(playerScores);
            const team1Kills = playerScoresQ.where(_ => _.team === 1).sum(_ => _.stats.Deaths);
            const team2Kills = playerScoresQ.where(_ => _.team === 0).sum(_ => _.stats.Deaths);
            const team1Level = playerScoresQ.first(_ => _.team === 0).stats.TeamLevel;
            const team2Level = playerScoresQ.first(_ => _.team === 1).stats.TeamLevel;
            const winningTeam = playerScoresQ.first(_ => _.team === 0).won ? 0 : 1;

            const scoreData: IScoreScreenData = {
                winningTeam,
                team1Kills,
                team2Kills,
                team1Level,
                team2Level,
                playerScores
            };
            return scoreData;
        })();
    }

    @RunOnWorker()
    @RequiredReplayVersion(40336, 'Player score data not supported by this version of replay')
    public get playerScoresSimple(): Promise<ISimplePlayerScore[]> {
        return (async (): Promise<any> => {
            const trackerQueriable = await this.trackerEventsQueriable;
            const players = await this.basicReplayAnalyser.playerList;
            const playersQ = linq.from(players);
            const results = <ISScoreResultEvent><any>trackerQueriable.where(e => isSScoreResultEvent(e)).last();
            const scoreStats = [
                "Takedowns",
                "Deaths",
                "SoloKill",
                "Assists",
                "ExperienceContribution",
                "Healing",
                "SiegeDamage",
                "HeroDamage",
                "DamageTaken",
                "TeamLevel"
            ];
            const stats = linq.from(results.m_instanceList)
                .where(e => scoreStats.indexOf(e.m_name) !== -1)
                .toArray();

            const awards = linq.from(results.m_instanceList)
                .where(e => e.m_name.startsWith('EndOfMatchAward'))
                .toArray();

            const playerScores = playersQ.select(_ => ({
                slot: _.slot,
                name: _.name,
                team: _.team,
                hero: _.hero,
                won: _.won,
                hasChatSilence: _.hasChatSilence,
                hasVoiceSilence: _.hasVoiceSilence,
                stats: {},
                awards: []
            })).toArray();
            const playerScoresQ = linq.from(playerScores);

            for (let i = 0; i < stats.length; i++) {
                const stat = stats[i];
                const statName = stat.m_name;
                const statQ = linq.from(stat.m_values)
                    .select((_, i) => ({
                        slot: i, value: _.length ? _[0].m_value : undefined
                    }))
                    .where(_ => _.value != undefined)
                    .join(playerScoresQ, (s) => s.slot, p => p.slot, (s, p) => {
                        p.stats[statName] = s.value;
                        return p;
                    }).toArray();
            }

            for (let i = 0; i < awards.length; i++) {
                const award = awards[i];
                const awardName = award.m_name.substring(0, award.m_name.length - 7).substring(15);
                const statQ = linq.from(award.m_values)
                    .select((_, i) => ({
                        slot: i, value: _.length ? _[0].m_value : undefined
                    }))
                    .where(_ => _.value != undefined)
                    .join(playerScoresQ, (s) => s.slot, p => p.slot, (s, p) => {
                        //p.scores[statName] = s.value;
                        if(s.value === 1){
                           p.awards.push(awardName);
                        }
                        return p;
                    }).toArray();
            }
           
            return playerScores;
        })();
    }
}

