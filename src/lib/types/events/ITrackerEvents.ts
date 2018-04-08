import { IReplayTrackerEvent, isIReplayTrackerEvent } from './IReplayEvent';

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


export interface IKeyValueArray<T>{
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