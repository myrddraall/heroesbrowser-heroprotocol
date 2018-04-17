import { Replay } from '../../Replay';
import * as linq from 'linq';
import * as sha1 from 'sha1';
import { IReplayDetailsPlayer } from '../../../types';
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { GameType, IReplayVeriosn } from '../types';
import { PlayerAnalyser, IPlayerSlot } from './PlayerAnalyser';


export interface ReplayDescription {
    fingerPrint: string;
    mapName: string;
    gameDurationTicks: number;
    gameDuration: number;
    version: IReplayVeriosn;
    gameType: GameType;
    timeZone: number;
    playedOn: Date;
    winningTeam: number;
    players: IPlayerSlot[];
}


@ReplayAnalyserContext('1B90BC76-8CE8-495C-A978-ABFD78DBB72A')
export class BasicReplayAnalyser extends AbstractReplayAnalyser {
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
    public get fingerPrint(): Promise<string> {
        return (async (): Promise<string> => {
            let fp = '';
            const head = await this.header;
            const init = await this.initData;
            fp = head.m_elapsedGameLoops.toString(16);
            fp += '|' + init.m_syncLobbyState.m_gameDescription.m_randomValue;
            fp += '|' + init.m_syncLobbyState.m_gameDescription.m_gameOptions.m_ammId;
            fp += '|' + linq.from(init.m_syncLobbyState.m_lobbyState.m_slots)
                .toJoinedString('#', elm => elm.m_hero + '~' + elm.m_teamId + '~' + elm.m_toonHandle);
            return sha1(fp);
        })();
    }

    @RunOnWorker()
    public get gameDurationTicks(): Promise<number> {
        return (async (): Promise<number> => {
            const head = await this.header;
            return head.m_elapsedGameLoops;
        })();
    }

    public get gameDuration(): Promise<number> {
        return (async (): Promise<number> => {
            return (await this.gameDurationTicks) / 16;
        })();
    }

    @RunOnWorker()
    public get mapName(): Promise<string> {
        return (async (): Promise<string> => {
            const details = await this.details;
            return details.m_title;
        })();
    }

    @RunOnWorker()
    public get winningTeam(): Promise<number> {
        return (async (): Promise<number> => {
            const players = await this.playerList;
            return linq.from(players).first(_ => _.team === 0).won ? 0 : 1;
        })();
    }

    @RunOnWorker()
    public get timeZone(): Promise<number> {
        return (async (): Promise<number> => {
            const details = await this.details;
            return details.m_timeLocalOffset / 10000000 / 60 / 60;
        })();
    }

    @RunOnWorker()
    public get playedOn(): Promise<Date> {
        return (async (): Promise<Date> => {
            const details = await this.details;
            return new Date(details.m_timeUTC / 10000 - 11644473600000);
        })();
    }

    @RunOnWorker()
    public get playerList(): Promise<IPlayerSlot[]> {
        return this.playerAnalyser.playerSlotData;
    }

    @RunOnWorker()
    public get replayDescription(): Promise<ReplayDescription> {
        return (async (): Promise<ReplayDescription> => {
            return {
                fingerPrint: await this.fingerPrint,
                gameType: await this.gameType,
                version: await this.version,
                gameDurationTicks: await this.gameDurationTicks,
                gameDuration: await this.gameDuration,
                mapName: await this.mapName,
                timeZone: await this.timeZone,
                playedOn: await this.playedOn,
                winningTeam: await this.winningTeam,
                players: await this.playerList
            };
        })();
    }
}
