import { IReplayTrackerEvent, isIReplayTrackerEvent } from './IReplayEvent';
import * as linq from 'linq';

export interface ISUnitBornEvent extends IReplayTrackerEvent {
    readonly _event: 'NNet.Replay.Tracker.SUnitBornEvent';
    readonly m_controlPlayerId: number;
    readonly m_unitTagIndex: number;
    readonly m_unitTagRecycle: number;
    readonly m_unitTypeName: string;
    readonly m_upkeepPlayerId: number;
    readonly m_x: number;
    readonly m_y: number;
}

export function isSUnitBornEvent(obj: any): obj is ISUnitBornEvent {
    return isIReplayTrackerEvent(obj) && obj._event === 'NNet.Replay.Tracker.SUnitBornEvent';
}

export interface ISUnitDiedEvent extends IReplayTrackerEvent {
    readonly _event: 'NNet.Replay.Tracker.SUnitDiedEvent';
    readonly m_killerPlayerId: number;
    readonly m_unitTagIndex: number;
    readonly m_unitTagRecycle: number;
    readonly m_killerUnitTagIndex: number;
    readonly m_killerUnitTagRecycle: number;
    readonly m_x: number;
    readonly m_y: number;
}

export function isSUnitDiedEvent(obj: any): obj is ISUnitDiedEvent {
    return isIReplayTrackerEvent(obj) && obj._event === 'NNet.Replay.Tracker.SUnitDiedEvent';
}

export interface IKeyValueArray<T> {
    readonly m_name: string;
    readonly m_values: T[][];
}
export interface IScoreResult {
    readonly m_time: number;
    readonly m_value: number;
}


export interface ISScoreResultEvent {
    readonly m_instanceList: IKeyValueArray<IScoreResult>[];
}

export function isSScoreResultEvent(obj: any): obj is ISScoreResultEvent {
    return isIReplayTrackerEvent(obj) && obj._event === 'NNet.Replay.Tracker.SScoreResultEvent';
}


export interface ISHeroBannedEvent extends IReplayTrackerEvent {
    readonly _event: 'NNet.Replay.Tracker.SHeroBannedEvent';
    readonly m_controllingTeam: number;
    readonly m_hero: string
}

export function isSHeroBannedEvent(obj: any): obj is ISHeroBannedEvent {
    return isIReplayTrackerEvent(obj) && obj._event === 'NNet.Replay.Tracker.SHeroBannedEvent';
}


export interface ISHeroPickedEvent extends IReplayTrackerEvent {
    readonly _event: 'NNet.Replay.Tracker.SHeroPickedEvent';
    readonly m_controllingPlayer: number;
    readonly m_hero: string
}


export function isSHeroPickedEvent(obj: any): obj is ISHeroPickedEvent {
    return isIReplayTrackerEvent(obj) && obj._event === 'NNet.Replay.Tracker.SHeroPickedEvent';
}


export interface ISStatGameEventData<T> {
    m_key: string;
    m_value: T
}

export interface ISStatGameEvent extends IReplayTrackerEvent {
    readonly _event: 'NNet.Replay.Tracker.SStatGameEvent';
    readonly m_eventName: string;
    readonly m_fixedData?: ISStatGameEventData<number>[];
    readonly m_intData?: ISStatGameEventData<number>[];
    readonly m_stringData?: ISStatGameEventData<string>[];
}


export function isSStatGameEvent(obj: any): obj is ISStatGameEvent {
    return isIReplayTrackerEvent(obj) && obj._event === 'NNet.Replay.Tracker.SStatGameEvent';
}

export function isPeriodicXPBreakdownSStatGameEvent(obj: any): obj is ISStatGameEvent {
    return isSStatGameEvent(obj) && obj.m_eventName === 'PeriodicXPBreakdown';
}

export function isEndOfGameXPBreakdownSStatGameEvent(obj: any): obj is ISStatGameEvent {
    return isSStatGameEvent(obj) && obj.m_eventName === 'EndOfGameXPBreakdown';
}

export function isGameStartSStatGameEvent(obj: any): obj is ISStatGameEvent {
    return isSStatGameEvent(obj) && obj.m_eventName === 'GameStart';
}

export function getSStatValue<T>(from: ISStatGameEventData<T>[], key: string, asFloat: boolean = false): T {
    if (from) {
        var r = linq.from(from).singleOrDefault(_ => _.m_key === key);
        if (r) {
            if(asFloat && typeof r.m_value === 'number'){
                return <T><any>(r.m_value / 4096);
            }
            return r.m_value;
        }
    }
    return undefined;
}