import { IReplayGameEventBase } from './IReplayEvent';
import { IAbility } from '../IBaseTypes';
export declare const MessageEventTypes: string[];
export interface IReplayMessageEvent extends IReplayGameEventBase {
}
export declare function isIReplayMessageEvent(obj: any): obj is IReplayMessageEvent;
export interface ISLoadingProgressMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SLoadingProgressMessage';
    readonly m_progress: number;
}
export declare function isISLoadingProgressMessage(obj: any): obj is ISLoadingProgressMessage;
export interface ISPingMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SPingMessage';
    readonly m_recipient: number;
    readonly m_point: {
        x: number;
        y: number;
    };
}
export declare function isISPingMessage(obj: any): obj is ISPingMessage;
export interface ISChatMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SChatMessage';
    readonly m_recipient: number;
    readonly m_string: string;
}
export declare function isISChatMessage(obj: any): obj is ISChatMessage;
export interface ISPlayerAnnounceMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SPlayerAnnounceMessage';
    readonly m_announceLink: number;
    readonly m_announcement: {
        Ability: IAbility;
    };
    readonly m_otherUnitTag: number;
    readonly m_unitTag: number;
}
export declare function isISPlayerAnnounceMessage(obj: any): obj is ISPlayerAnnounceMessage;
export interface ISReconnectNotifyMessage extends IReplayMessageEvent {
    readonly _event: 'NNet.Game.SReconnectNotifyMessage';
    readonly m_status: number;
}
export declare function isISReconnectNotifyMessage(obj: any): obj is ISReconnectNotifyMessage;
