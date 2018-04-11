
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import {
    isSHeroBannedEvent, ISHeroBannedEvent,
    isSHeroPickedEvent, ISHeroPickedEvent
} from '../../../types';
import * as linq from 'linq';
import { PlayerAnalyser, IPlayerSlot } from './PlayerAnalyser';
import { ReplayAttributeHelper } from '../../util/ReplayAttributeHelper';
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';

// import { RequiredReplayVersion } from '../decorators';

export interface IHeroBan {
    type: string;
    team: number;
    hero: string;
}

export interface IHeroPick extends IHeroBan {
    userId: number;
    playerName: string;
}


@ReplayAnalyserContext('DF24FAC3-D273-4CA0-83A3-E8D365F15283')
export class DraftAnalyser extends AbstractReplayAnalyser {
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
    public get bans(): Promise<IHeroBan[]> {
        return (async (): Promise<IHeroBan[]> => {
            const heroData = linq.from(await this.heroData);

            const helper = new ReplayAttributeHelper(await this.attributeEvents);
            const trackQ = await this.trackerEventsQueriable;
            const result = trackQ
                .where(_ => isSHeroBannedEvent(_))
                .select((_: ISHeroBannedEvent, i) => {
                    const team = _.m_controllingTeam - 1;
                    const heroShort = helper.getBan(team, i < 2 ? 0 : 1);
                    const hero:any = heroData.single((_: any) => _.attribute_id === heroShort);
                    return (<IHeroBan>{
                        type: 'ban',
                        team: _.m_controllingTeam - 1,
                        hero: hero.name
                    })
                })
                .toArray();
            return result;
        })();
    }

    @RunOnWorker()
    public get picks(): Promise<IHeroPick[]> {
        return (async (): Promise<IHeroPick[]> => {
            const trackQ = await this.trackerEventsQueriable;
            const players = linq.from(await this.playerAnalyser.playerSlotData);
            const result = trackQ
                .where(_ => isSHeroPickedEvent(_))
                .join(
                    players,
                    (pick: ISHeroPickedEvent) => pick.m_controllingPlayer,
                    (player) => player.userId,
                    (pick: ISHeroPickedEvent, player) => (<IHeroPick>{
                        type: 'pick',
                        team: player.team,
                        userId: player.userId,
                        playerName: player.name,
                        hero: player.hero
                    })
                )
                .toArray();
            return result;
        })();
    }

    @RunOnWorker()
    public get draft(): Promise<Array<IHeroBan | IHeroPick>> {
        return (async (): Promise<Array<IHeroBan | IHeroPick>> => {
            const bans = await this.bans;
            const picks = await this.picks;
            const helper = new ReplayAttributeHelper(await this.attributeEvents);

            switch (helper.banType) {
                case '1ban': {
                    return this.order1banDraft(bans, picks);
                } case '2ban': {
                    return this.order2banDraft(bans, picks);
                } case 'Mban': {
                    return this.orderMbanDraft(bans, picks);
                }
            }

        })();
    }

    private orderMbanDraft(bans: IHeroBan[], picks: IHeroPick[]): Array<IHeroBan | IHeroPick> {
        const result: Array<IHeroBan | IHeroPick> = [];
        result.push(bans[0]);
        result.push(bans[1]);
        result.push(picks[0]);
        result.push(picks[1]);
        result.push(picks[2]);
        result.push(picks[3]);
        result.push(picks[4]);
        result.push(bans[2]);
        result.push(bans[3]);
        result.push(picks[5]);
        result.push(picks[6]);
        result.push(picks[7]);
        result.push(picks[8]);
        result.push(picks[9]);
        return result;
    }

    private order1banDraft(bans: IHeroBan[], picks: IHeroPick[]): Array<IHeroBan | IHeroPick> {
        return [...bans, ...picks];
    }

    private order2banDraft(bans: IHeroBan[], picks: IHeroPick[]): Array<IHeroBan | IHeroPick> {
        return [...bans, ...picks];
    }
}

