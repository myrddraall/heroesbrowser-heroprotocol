
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import { IReplayTrackerEvent, isSScoreResultEvent, ISScoreResultEvent, isSGameUserLeaveEvent, isSGameUserJoinEvent, UserLeaveReason, ISGameUserLeaveEvent, ISGameUserJoinEvent } from '../../../types';
import * as linq from 'linq';
import { BasicReplayAnalyser } from './BasicReplayAnalyser'
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { RequiredReplayVersion } from '../decorators';
import { ReplayVersionOutOfRangeError } from "../../errors";
import { HeroRole } from '../types';


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
    "TeamfightHeroDamage": number;
    "MinionDamage": number;
    "StructureDamage": number;
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
    stats: IPlayerScoreStats;
}


export interface IPlayerStatData {
    statNotes: { [stat: string]: string[] };
    playerStats: IPlayerScore[];
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
            return playerScores;
        })();
    }

    private addStatNote(statNotes: { [stat: string]: Set<string> }, stat:string, note: string) {
        if(!statNotes[stat]){
            statNotes[stat] = new Set();
        }
        statNotes[stat].add(note);
    }
    @RunOnWorker()
    @RequiredReplayVersion(40336, 'Player score data not supported by this version of replay')
    public get playerScoresFull(): Promise<IPlayerStatData> {
        return (async (): Promise<IPlayerStatData> => {
            const result: IPlayerStatData = {
                statNotes: {},
                playerStats: []
            };

            const statNotes: { [stat: string]: Set<string> } = {};
            const gameEventQueriable = await this.gameEventsQueriable;
            const trackerQueriable = await this.trackerEventsQueriable;
            const players = await this.basicReplayAnalyser.playerList;
            const stats = <ISScoreResultEvent><any>trackerQueriable.where(_ => isSScoreResultEvent(_)).last();
            const tickRate = await this.tickRate;
            const gameTime = stats._gameloop / tickRate;

            const playerDCQuery = linq.from<ISGameUserLeaveEvent | ISGameUserJoinEvent>(<any[]>gameEventQueriable
                .where(_ => (isSGameUserLeaveEvent(_) && _.m_leaveReason !== UserLeaveReason.END_OF_GAME) || isSGameUserJoinEvent(_))
                .toArray());

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

            const teamTeamfightDamageTaken = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.TeamfightDamageTaken),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.TeamfightDamageTaken),
            ];

            const teamHeroDamage = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.HeroDamage),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.HeroDamage),
            ];

            const teamTeamfightHeroDamage = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.TeamfightHeroDamage),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.TeamfightHeroDamage),
            ];

            const teamSiegeDamage = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.SiegeDamage),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.SiegeDamage),
            ];

            const teamMinionDamage = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.MinionDamage),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.MinionDamage),
            ];

            const teamStructureDamage = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.StructureDamage),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.StructureDamage),
            ];

            const teamCreepDamage = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.CreepDamage),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.CreepDamage),
            ];

            const teamHealing = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.Healing),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.Healing),
            ];

            const teamProtection = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.ProtectionGivenToAllies),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.ProtectionGivenToAllies),
            ];

            const teamTeamfightHealing = [
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.TeamfightHealingDone),
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.TeamfightHealingDone),
            ];

            const teamHeroDamageAgainst = [
                playerStatsQ.where(_ => _.team === 1).sum(_ => _.stats.HeroDamage),
                playerStatsQ.where(_ => _.team === 0).sum(_ => _.stats.HeroDamage),
            ];

            for (let i = 0; i < playerStats.length; i++) {
                const playerStat = playerStats[i];
                const player = players[i];
                const pStats = playerStat.stats;

                pStats['Disconnects'] =  playerDCQuery.count(_ => _._userid.m_userId === player.userId && isSGameUserLeaveEvent(_));
                pStats['Reconnects'] =  playerDCQuery.count(_ => _._userid.m_userId === player.userId && isSGameUserJoinEvent(_));

                const dcs = playerDCQuery.where(_ =>  _._userid.m_userId === player.userId).toArray();
                let lastDCTime = -1;
                let totalDCTime = 0;
                let lastWasDC = false;
                for (let j = 0; j < dcs.length; j++) {
                    const event = dcs[j];
                    if(isSGameUserLeaveEvent(event)){
                        lastDCTime = event._gameloop / tickRate;
                        lastWasDC = true;
                    }else if(isSGameUserJoinEvent(event)){
                        lastWasDC = false;
                        if(lastDCTime === -1){
                            console.warn('Join event without leave event', event);
                        }else{
                            totalDCTime += (event._gameloop / tickRate) - lastDCTime;
                        }
                    }
                }
                if(lastWasDC){
                    totalDCTime += gameTime - lastDCTime;
                }
                pStats['TimeDisconnected'] = totalDCTime;
                pStats['PercentOfGameDisconnected'] = totalDCTime / gameTime;
                
                pStats['KillParticipation'] = pStats.Takedowns / teamTakedowns[playerStat.team];

                pStats['AverageHeroDamagePerLife'] = pStats.HeroDamage / (pStats.Deaths + 1);
                pStats['AverageTeamfightHeroDamagePerLife'] = pStats.TeamfightHeroDamage / (pStats.Deaths + 1);
                pStats['AverageSiegeDamagePerLife'] = pStats.SiegeDamage / (pStats.Deaths + 1);
                pStats['AverageHealingPerLife'] = pStats.Healing / (pStats.Deaths + 1);
                pStats['AverageTeamfightHealingPerLife'] = pStats.TeamfightHealingDone / (pStats.Deaths + 1);
                pStats['AverageDamageTakenPerLife'] = pStats.DamageTaken / (pStats.Deaths + 1);
                pStats['AverageTeamfightDamageTakenPerLife'] = pStats.TeamfightDamageTaken / (pStats.Deaths + 1);

                if(this.versionMatches('<63507')){
                    this.addStatNote(statNotes, 'DamageSoaked', 'Not available in this replay version');
                    this.addStatNote(statNotes, 'DamageTaken', 'Only available for Warriors in this replay version');
                    this.addStatNote(statNotes, 'AverageDamageTakenPerLife', 'Only available for Warriors in this replay version');
                }
                if (this.versionMatches('<63507') && player.role !== HeroRole.WARRIOR) {
                    pStats['AverageDamageTakenPerLife'] = null;
                    pStats.DamageTaken = null;
                    pStats.DamageSoaked = null;
                }

                pStats['KDARatio'] = pStats.Takedowns / (pStats.Deaths + 1);
                pStats['KDRatio'] = pStats.SoloKill / (pStats.Deaths + 1);
                pStats['ADRatio'] = pStats.Assists / (pStats.Deaths + 1);

                pStats['PercentHeroDamage'] = pStats.HeroDamage / (teamHeroDamage[playerStat.team] || 1);
                pStats['PercentTeamfightHeroDamage'] = pStats.HeroDamage / (teamTeamfightHeroDamage[playerStat.team] || 1);

                pStats['PercentSiegeDamage'] = pStats.SiegeDamage / (teamSiegeDamage[playerStat.team] || 1);
                pStats['PercentStructureDamage'] = pStats.StructureDamage / (teamStructureDamage[playerStat.team] || 1);
                pStats['PercentMinionDamage'] = pStats.MinionDamage / (teamMinionDamage[playerStat.team] || 1);
                pStats['PercentCreepDamage'] = pStats.CreepDamage / (teamCreepDamage[playerStat.team] || 1);

                pStats['PercentHealing'] = pStats.Healing / (teamHealing[playerStat.team] || 1);
                pStats['PercentProtection'] = pStats.ProtectionGivenToAllies / (teamProtection[playerStat.team] || 1);
                pStats['PercentTeamfightHealing'] = pStats.TeamfightHealingDone / (teamTeamfightHealing[playerStat.team] || 1);

                pStats['PercentDamageTaken'] = pStats.DamageTaken / (teamHealing[playerStat.team] || 1);
                pStats['PercentTeamfightDamageTaken'] = pStats.TeamfightDamageTaken / (teamTeamfightDamageTaken[playerStat.team] || 1);
                if (this.versionMatches('<63507') && player.role !== HeroRole.WARRIOR) {
                    pStats['PercentDamageTaken'] = null;
                    pStats['PercentTeamfightDamageTaken'] = null;
                    this.addStatNote(statNotes, 'PercentDamageTaken', 'Only available for Warriors in this replay version');
                    this.addStatNote(statNotes, 'PercentTeamfightDamageTaken', 'Only available for Warriors in this replay version');
                }

                pStats['PercentXPContribution'] = pStats.ExperienceContribution / (pStats.MetaExperience || 1);
                pStats['PercentGameSpentDead'] = pStats.TimeSpentDead / (gameTime || 1);
                pStats['PercentTimeOnFire'] = pStats.OnFireTimeOnFire / (gameTime || 1);

                pStats['PercentDamageHealed'] = pStats.Healing / (teamDamageTaken[playerStat.team] || 1);
                // older replays only record damage taken for warriors // flacky fix wont be accurate as hero damage is from heroes only and damage taken is from all sources
                if (this.versionMatches('<63507')) {
                    pStats['PercentDamageHealed'] = pStats.Healing / (teamHeroDamageAgainst[playerStat.team] || 1);
                    this.addStatNote(statNotes, 'PercentDamageHealed', 'Inacurate');
                    this.addStatNote(statNotes, 'PercentDamageHealed', 'Since Damage Taken is only available for warriors in this replay version the calculation uses Hero Damage done agaisnt the team, however healing includes damage healed from all sources, as such the numbers will be inflated');
                }

            }

            result.playerStats = playerStats;

            for (const stat in statNotes) {
                if (statNotes.hasOwnProperty(stat)) {
                    const notes = statNotes[stat];
                    result.statNotes[stat] = Array.from(notes);
                }
            }

            return result;
        })();
    }
}

