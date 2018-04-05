
import { IReplayFile, IReplayColor } from './IBaseTypes';

export interface IReplayDetailsToon{
    readonly m_id: number;
    readonly m_programId: string;
    readonly m_realm: number;
    readonly m_region: number;
}

export interface IReplayDetailsPlayer {
    readonly m_color: IReplayColor;
    readonly m_control: number;
    readonly m_handicap: number;
    readonly m_hero: string;
    readonly m_name: string;
    readonly m_observe: number;
    readonly m_race: string;
    readonly m_result: number;
    readonly m_teamId: number;
    readonly m_toon: IReplayDetailsToon;
    readonly m_workingSetSlotId: number;

}

export interface IReplayDetails {
    readonly m_cacheHandles: string[];
    readonly m_defaultDifficulty: number;
    readonly m_difficulty: string;
    readonly m_gameSpeed: number;
    readonly m_isBlizzardMap: boolean;
    readonly m_mapFileName: string;
    readonly m_miniSave: boolean;
    readonly m_modPaths: null;
    readonly m_playerList: IReplayDetailsPlayer[];
    readonly m_restartAsTransitionMap: boolean;
    readonly m_thumbnail: IReplayFile;
    readonly m_timeLocalOffset: number;
    readonly m_timeUTC: number;
    readonly m_title: string;
}
