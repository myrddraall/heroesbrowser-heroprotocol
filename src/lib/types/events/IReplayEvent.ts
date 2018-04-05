// tslint:disable:no-empty-interface
export interface IReplayEvent {
    readonly _event: string;
    readonly _eventid: number;
    readonly _gameloop: number;
    readonly _bits: number;
}

export function isIReplayEvent(obj: any): obj is IReplayEvent {
    return '_event' in obj && obj._event.indexOf('NNet.') === 0;
}

export interface IReplayUserEvent extends IReplayEvent {
    readonly _userid: { m_userId: number };

}

export function isIReplayUserEvent(obj: any): obj is IReplayUserEvent {
    return isIReplayEvent(obj) && '_userid' in obj;
}


export interface IReplayGameEventBase extends IReplayUserEvent { }

export function isIReplayGameEventBase(obj: any): obj is IReplayGameEventBase {
    return isIReplayEvent(obj) && obj._event.indexOf('NNet.Game.') === 0;
}

export interface IReplayTrackerEvent extends IReplayEvent { }

export function isIReplayTrackerEvent(obj: any): obj is IReplayTrackerEvent {
    return isIReplayEvent(obj) && obj._event.indexOf('NNet.Replay.Tracker.') === 0;
}

