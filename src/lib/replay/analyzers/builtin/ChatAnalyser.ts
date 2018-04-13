
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import {
    isISChatMessage, ISChatMessage,
    isISPingMessage, ISPingMessage,
    IPoint
} from '../../../types';
import * as linq from 'linq';
import { PlayerAnalyser, IPlayerSlot } from './PlayerAnalyser';
import { ReplayAttributeHelper } from '../../util/ReplayAttributeHelper';
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';

// import { RequiredReplayVersion } from '../decorators';

export interface IChatMessage {
    message: string;
    time: number;
    recipient: number;
    userId: number;
    playerName: string;
    team: number;
}

export interface IPing {
    point: IPoint;
    time: number;
    recipient: number;
    userId: number;
    playerName: string;
    team: number;
}



@ReplayAnalyserContext('80021810-3AD4-418D-9FB5-49081355019A')
export class ChatAnalyser extends AbstractReplayAnalyser {
    private playerAnalyser: PlayerAnalyser;
    public constructor(replay: Replay) {
        super(replay);
    }
    public async initialize(): Promise<void> {
        await super.initialize();
        this.playerAnalyser = new PlayerAnalyser(this.replay);
        await this.playerAnalyser.initialize();
    }

    @RunOnWorker()
    public get chatMessages(): Promise<IChatMessage[]> {
        return (async (): Promise<IChatMessage[]> => {
            const messageQ = await this.messageEventsQueriable;
            const playerQ = <linq.IEnumerable<IPlayerSlot>><any>linq.from(this.playerAnalyser.playerSlotData);
            const tickRate = await this.tickRate;
            const result = messageQ
                .where(_ => isISChatMessage(_))
                .join(
                    playerQ,
                    m => m._userid.m_userId,
                    p => p.userId,
                    (m: ISChatMessage, p: IPlayerSlot) => ({
                        message: m.m_string,
                        time: m._gameloop / tickRate,
                        recipient: m.m_recipient,
                        userId: p.userId,
                        playerName: p.name,
                        team: p.team
                    })
                ).toArray();
            return result;
        })();
    }

    @RunOnWorker()
    public get pings(): Promise<IPing[]> {
        return (async (): Promise<IPing[]> => {
            const messageQ = await this.messageEventsQueriable;
            const playerQ = <linq.IEnumerable<IPlayerSlot>><any>linq.from(this.playerAnalyser.playerSlotData);
            const tickRate = await this.tickRate;
            const result = messageQ
                .where(_ => isISPingMessage(_))
                .join(
                    playerQ,
                    m => m._userid.m_userId,
                    p => p.userId,
                    (m: ISPingMessage, p: IPlayerSlot) => ({
                        point: {
                            x: m.m_point.x / 4096,
                            y: m.m_point.y / 4096
                        },
                        time: m._gameloop / tickRate,
                        recipient: m.m_recipient,
                        userId: p.userId,
                        playerName: p.name,
                        team: p.team
                    })
                ).toArray();
            return result;
        })();
    }
}

