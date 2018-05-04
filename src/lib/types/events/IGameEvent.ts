import { IReplayGameEvent, isIReplayGameEvent } from './IReplayEvent';


export enum UserLeaveReason {
    END_OF_GAME = 0,
    DISCONNECTED = 11
}


export interface ISGameUserLeaveEvent extends IReplayGameEvent {
    m_leaveReason: number | UserLeaveReason;
}

export function isSGameUserLeaveEvent(obj: any): obj is ISGameUserLeaveEvent {
    return isIReplayGameEvent(obj) && obj._event === 'NNet.Game.SGameUserLeaveEvent';
}

export interface ISGameUserJoinEvent extends IReplayGameEvent {
    m_clanLogo: string;
    m_clanTag: string;
    m_hijack: boolean;
    m_hijackCloneGameUserId: number;
    m_name: string;
    m_observe: number;
    m_toonHandle: string;
}

export function isSGameUserJoinEvent(obj: any): obj is ISGameUserJoinEvent {
    return isIReplayGameEvent(obj) && obj._event === 'NNet.Game.SGameUserJoinEvent';
}

