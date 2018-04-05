import { Replay } from './Replay';
export declare enum GameType {
    UNKNOWN = 0,
    FLAG_SOLO_QUEUE = 1,
    FLAG_COOP = 2,
    FLAG_PVP = 4,
    FLAG_DRAFT = 8,
    FLAG_RANKED = 16,
    MODE_PRACTICE = 32,
    MODE_AI = 64,
    MODE_BRAWL = 128,
    MODE_QM = 256,
    MODE_UR = 512,
    MODE_HL = 1024,
    MODE_TL = 2048,
    MODE_CUSTOM = 4096,
    PRACTICE = 33,
    SOLO_AI = 65,
    COOP_AI = 66,
    CUSTOM = 4100,
    CUSTOM_DRAFT = 4108,
    BRAWL = 132,
    QUICK_MATCH = 260,
    UNRANKED_DRAFT = 524,
    HERO_LEAGUE = 1053,
    TEAM_LEAGUE = 2076,
}
export interface ReplayDescription {
    fingerPrint: string;
    mapName: string;
    gameDurationTicks: number;
    gameDuration: number;
    version: {
        major: number;
        minor: number;
        revision: number;
        build: number;
        protocol: number;
    };
    gameType: GameType;
    timeZone: number;
    playedOn: Date;
    winningTeam: number;
    players: BasicPlayerData[];
}
export interface BasicPlayerData {
    id: string;
    name: string;
    hero: string;
    team: number;
    won: boolean;
    observer: boolean;
}
export declare class BasicReplayAnalyser {
    private replay;
    constructor(replay: Replay);
    readonly fingerPrint: Promise<string>;
    readonly gameDurationTicks: Promise<number>;
    readonly gameDuration: Promise<number>;
    readonly version: Promise<{
        major: number;
        minor: number;
        revision: number;
        build: number;
        protocol: number;
    }>;
    readonly gameType: Promise<GameType>;
    isGameType(type: GameType): Promise<boolean>;
    readonly mapName: Promise<string>;
    readonly winningTeam: Promise<number>;
    readonly timeZone: Promise<number>;
    readonly playedOn: Promise<Date>;
    readonly playerList: Promise<BasicPlayerData[]>;
    readonly replayDescription: Promise<ReplayDescription>;
}
