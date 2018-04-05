export interface IReplayEvent {
    readonly _event: string;
    readonly _eventid: number;
    readonly _gameloop: number;
    readonly _bits: number;
}
export declare function isIReplayEvent(obj: any): obj is IReplayEvent;
export interface IReplayUserEvent extends IReplayEvent {
    readonly _userid: {
        m_userId: number;
    };
}
export declare function isIReplayUserEvent(obj: any): obj is IReplayUserEvent;
export interface IReplayGameEventBase extends IReplayUserEvent {
}
export declare function isIReplayGameEventBase(obj: any): obj is IReplayGameEventBase;
export interface IReplayTrackerEvent extends IReplayEvent {
}
export declare function isIReplayTrackerEvent(obj: any): obj is IReplayTrackerEvent;
