
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import { IReplayTrackerEvent, isSScoreResultEvent, ISScoreResultEvent } from '../../../types';
import * as linq from 'linq';
import { BasicReplayAnalyser } from './BasicReplayAnalyser'
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { RequiredReplayVersion } from '../decorators';
import { ReplayVersionOutOfRangeError } from "../../errors";



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

export interface IPlayerScoreStats {
    "Takedowns": number;
    "Deaths": number;
    "SoloKill": number;
    "Assists": number;
    "MetaExperience": number;
    "ExperienceContribution": number;
    "Healing": number;
    "SiegeDamage": number;
    "HeroDamage": number;
    "DamageTaken": number;
    "TeamLevel": number;
    "MercCampCaptures": number;
    "WatchTowerCaptures": number;
    "SelfHealing": number;
    "TimeSpentDead": number;
    "TimeCCdEnemyHeroes": number;
    "CreepDamage": number;
    "SummonDamage": number;
    "DamageSoaked": number;
    "HighestKillStreak": number;
    "ProtectionGivenToAllies": number;
    "TimeSilencingEnemyHeroes": number;
    "TimeRootingEnemyHeroes": number;
    "ClutchHealsPerformed": number;
    "EscapesPerformed": number;
    "VengeancesPerformed": number;
    "TeamfightEscapesPerformed": number;
    "OutnumberedDeaths": number;
    "OnFireTimeOnFire": number;
    "TeamfightDamageTaken": number;
    "TimeOnPoint": number;
    "TeamfightHealingDone": number;
    // map specific
    "DamageDoneToImmortal"?: number;
    "DamageDoneToShrineMinions"?: number;

}

export interface ISimplePlayerScore {
    hero: string;
    name: string;
    team: number;
    won: boolean;
    hasChatSilence: boolean;
    hasVoiceSilence: boolean;
    stats: ISimplePlayerScoreStats;
    awards: string[];
}

export interface IPlayerScore {
    hero: string;
    name: string;
    team: number;
    won: boolean;
    hasChatSilence: boolean;
    hasVoiceSilence: boolean;
    stats: ISimplePlayerScoreStats;
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
                        if (s.value === 1) {
                            p.awards.push(awardName);
                        }
                        return p;
                    }).toArray();
            }


            const tmp = await this.playerScoresFull;
            console.log('playerScoresFull', tmp);
            return playerScores;
        })();
    }
  
    @RunOnWorker()
    @RequiredReplayVersion(40336, 'Player score data not supported by this version of replay')
    public get playerScoresFull(): Promise<IPlayerScore[]> {
        return (async (): Promise<any> => {
            const trackerQueriable = await this.trackerEventsQueriable;
            const players = await this.basicReplayAnalyser.playerList;

            const stats = <ISScoreResultEvent><any>trackerQueriable.where(_ => isSScoreResultEvent(_)).last();

            const playerStats: IPlayerScore[] = [];
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                const playerScore: IPlayerScore = {
                    name: player.name,
                    hero: player.hero,
                    team: player.team,
                    won: player.won,
                    hasChatSilence: player.hasChatSilence,
                    hasVoiceSilence: player.hasVoiceSilence,
                    stats: <IPlayerScoreStats>{}
                };

                for (let j = 0; j < stats.m_instanceList.length; j++) {
                    const stat = stats.m_instanceList[j];
                    if (
                        !stat.m_name.endsWith('Boolean') &&
                        !stat.m_name.endsWith('Talent') &&
                        !stat.m_name.startsWith('Plays') &&
                        !stat.m_name.startsWith('Wins') &&
                        !stat.m_name.startsWith('TeamWins') &&
                        !stat.m_name.endsWith('Level') &&
                        stat.m_name !== 'Role' &&
                        stat.m_name !== 'GameScore'
                    ) {
                        const pStats = stat.m_values[player.slot];
                        if (Array.isArray(pStats) && pStats.length) {
                            const pStat = pStats[0];
                            playerScore.stats[stat.m_name] = pStat.m_value;
                        }
                    }
                }
                playerStats.push(playerScore);
            }
            const playerStatsQ = linq.from(playerStats);

            const teamTakedowns = [
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.Deaths),
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.Deaths)
            ];

            const teamDamageTaken = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.DamageTaken),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.DamageTaken),
            ];

            const teamHeroDamageAgainst = [
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.HeroDamage),
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.HeroDamage),
            ];
           
            for (let i = 0; i < playerStats.length; i++) {
                const player = playerStats[i];
                const pStats = player.stats;
                pStats['KillParticipation'] = pStats.Takedowns / teamTakedowns[player.team];
                pStats['AverageDamageTakenPerLife'] = pStats.DamageTaken / (pStats.Deaths + 1);
                pStats['KDARatio'] = pStats.Takedowns / (pStats.Deaths + 1);
                pStats['KDRatio'] = pStats.SoloKill / (pStats.Deaths + 1);
                pStats['ADRatio'] = pStats.Assists / (pStats.Deaths + 1);
                pStats['PercentDamageHealed'] = pStats.Healing / (teamDamageTaken[player.team] || 1);
                // older replays only record damage taken for warriors // flacky fix wont be accurate as hero damage is from heroes only and damage taken is from all sources
                if(this.versionMatches('<63507')){
                    pStats['PercentDamageHealed'] = pStats.Healing / (teamHeroDamageAgainst[player.team] || 1);
                }

            }
            return playerStats;
        })();
    }
}

