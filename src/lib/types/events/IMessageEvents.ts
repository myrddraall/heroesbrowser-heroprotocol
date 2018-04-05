// tslint:disable:no-empty-interface
import { IReplayGameEventBase, isIReplayGameEventBase } from './IReplayEvent';
import { IAbility } from '../IBaseTypes';

export const MessageEventTypes: string[] = [
    'NNet.Game.SLoadingProgressMessage',
    'NNet.Game.SPingMessage',
    'NNet.Game.SChatMessage',
    'NNet.Game.SPlayerAnnounceMessage',
    'NNet.Game.SReconnectNotifyMessage'
];



export interface IReplayMessageEvent extends IReplayGameEventBase { }

export function isIReplayMessageEvent(obj: any): obj is IReplayMessageEvent {
    return isIReplayGameEventBase(obj) && MessageEventTypes.indexOf(obj._event) !== -1;
}

export interface ISLoadingProgressMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SLoadingProgressMessage';
    readonly m_progress: number;
}

export function isISLoadingProgressMessage(obj: any): obj is ISLoadingProgressMessage {
    return isIReplayGameEventBase(obj) && obj._event === 'NNet.Game.SLoadingProgressMessage';
}

export interface ISPingMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SPingMessage';
    readonly m_recipient: number;
    readonly m_point: { x: number, y: number };
}

export function isISPingMessage(obj: any): obj is ISPingMessage {
    return isIReplayGameEventBase(obj) && obj._event === 'NNet.Game.SPingMessage';
}

export interface ISChatMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SChatMessage';
    readonly m_recipient: number;
    readonly m_string: string;
}

export function isISChatMessage(obj: any): obj is ISChatMessage {
    return isIReplayGameEventBase(obj) && obj._event === 'NNet.Game.SChatMessage';
}

export interface ISPlayerAnnounceMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SPlayerAnnounceMessage';
    readonly m_announceLink: number;
    readonly m_announcement: { Ability: IAbility };
    readonly m_otherUnitTag: number;
    readonly m_unitTag: number;
}

export function isISPlayerAnnounceMessage(obj: any): obj is ISPlayerAnnounceMessage {
    return isIReplayGameEventBase(obj) && obj._event === 'NNet.Game.SPlayerAnnounceMessage';
}


export interface ISReconnectNotifyMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SReconnectNotifyMessage';
    readonly m_status: number;
}

export function isISReconnectNotifyMessage(obj: any): obj is ISReconnectNotifyMessage {
    return isIReplayGameEventBase(obj) && obj._event === 'NNet.Game.SReconnectNotifyMessage';
}