export interface IReplayInitData {
    m_syncLobbyState: ISyncLobbyState;
}

export interface ISyncLobbyState {
    m_gameDescription: IGameDescription;
    m_lobbyState: ILobbyState;
    m_userInitialData: IUserInitialData[];
}

export interface IGameDescription {
    m_cacheHandles: string[];
    m_defaultAIBuild: number;
    m_defaultDifficulty: number;
    m_gameCacheName: string;
    m_gameOptions: IGameOptions;
    m_gameSpeed: number;
    // **
    m_gameType: number;
    m_hasExtensionMod: boolean;
    m_isBlizzardMap: boolean;
    m_isCoopMode: boolean;
    m_isPremadeFFA: boolean;
    m_mapAuthorName: string;
    m_mapFileName: string;
    m_mapFileSyncChecksum: number;
    m_mapSizeX: number;
    m_mapSizeY: number;
    m_maxColors: number;
    m_maxControls: number;
    m_maxObservers: number;
    m_maxPlayers: number;
    m_maxRaces: number;
    m_maxTeams: number;
    m_maxUsers: number;
    m_modFileSyncChecksum: number;
    m_randomValue: number;
    m_slotDescriptions: ISlotDescription[];
}

export interface IGameOptions {
    m_advancedSharedControl: boolean;
    m_amm: boolean;
    m_ammId: number;
    m_battleNet: boolean;
    m_clientDebugFlags: number;
    m_competitive: boolean;
    m_cooperative: boolean;
    m_fog: number;
    m_heroDuplicatesAllowed: boolean;
    m_lockTeams: boolean;
    m_noVictoryOrDefeat: boolean;
    m_observers: number;
    m_practice: boolean;
    m_randomRaces: boolean;
    m_teamsTogether: boolean;
    m_userDifficulty: number;

}

export interface ISlotDescription {
    m_allowedAIBuilds: number[];
    m_allowedColors: number[];
    m_allowedControls: number[];
    m_allowedDifficulty: number[];
    m_allowedObserveTypes: number[];
    m_allowedRaces: number[];
}

export interface ILobbyState {
    m_defaultAIBuild: number;
    m_defaultDifficulty: number;
    m_gameDuration: number;
    m_hostUserId: number;
    m_isSinglePlayer: boolean;
    m_maxObservers: number;
    m_phase: number;
    m_pickedMapTag: number;
    m_randomSeed: number;
    m_slots: ILobbyStateSlot[];

}

export interface ILobbyStateSlot {
    m_aiBuild: number;
    m_announcerPack: string;
    m_artifacts: string[];
    m_banner: string;
    m_colorPref: number;
    m_control: number;
    m_difficulty: number;
    m_handicap: number;
    m_hasSilencePenalty: boolean;
    m_hasVoiceSilencePenalty: boolean;
    m_hero: string;
    m_heroMasteryTiers: Array<{ m_hero: string, m_tier: number }>;
    m_logoIndex: number;
    m_mount: string;
    m_observe: number;
    m_racePref: { m_race: null };
    m_rewards: number[];
    m_skin: string;
    m_spray: string;
    m_tandemLeaderUserId: null;
    m_teamId: number;
    m_toonHandle: string;
    m_userId: number;
    m_voiceLine: string;
    m_workingSetSlotId: number;
}

export interface IUserInitialData {
    m_banner: string;
    m_clanLogo: null;
    m_clanTag: string;
    m_combinedRaceLevels: number;
    m_customInterface: boolean;
    m_examine: boolean;
    m_name: string;
    m_hero: string;
    m_highestLeague: number;
    m_mount: string;
    m_observe: number;
    m_racePreference: { m_race: null };
    m_randomSeed: number;
    m_skin: string;
    m_spray: string;
    m_teamPreference: { m_team: null };
    m_testAuto: boolean;
    m_testMap: boolean;
    m_testType: boolean;
    m_toonHandle: string;
}