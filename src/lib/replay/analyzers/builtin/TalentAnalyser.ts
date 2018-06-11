
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import { IReplayTrackerEvent, isSStatGameEvent, ISStatGameEvent, getSStatValue, IHeroTalent } from '../../../types';
import * as linq from 'linq';
import { BasicReplayAnalyser } from './BasicReplayAnalyser'
import { ReplayVersionOutOfRangeError } from "../../errors";
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { RequiredReplayVersion } from '../decorators';


export interface ITalentPick extends IHeroTalent {
    time: number;
}

export interface IPlayerTalentChoices {
    playerName: string;
    team: number;
    hero: string;
    talents: ITalentPick[];
}

@ReplayAnalyserContext('959FCF54-0284-452B-85F9-81439FB7F498')
export class TalentAnalyser extends AbstractReplayAnalyser {
    private basicReplayAnalyser: BasicReplayAnalyser;

    public constructor(replay: Replay) {
        super(replay);
    }

    public async initialize(): Promise<void> {
        await super.initialize();
        this.basicReplayAnalyser = new BasicReplayAnalyser(this.replay);
        await this.basicReplayAnalyser.initialize();
    }

    @RunOnWorker()
    @RequiredReplayVersion(40336, 'Player talent data not supported by this version of replay')
    public get talents(): Promise<IPlayerTalentChoices[]> {
        return (async (): Promise<IPlayerTalentChoices[]> => {
            const trackerQueriable = await this.trackerEventsQueriable;
            const playerList = await this.basicReplayAnalyser.playerList;
            const players = linq.from(playerList);
            const heroData = linq.from(await this.replay.heroData);
            const tickRate = await this.tickRate;
            const talentQuery = trackerQueriable
                .where(_ => isSStatGameEvent(_) && _.m_eventName === 'TalentChosen')
                .groupBy((_: ISStatGameEvent) => getSStatValue(_.m_intData, 'PlayerID') - 1, _ => _, (key, event) => ({
                    index: key,
                    talents: event.select((_: ISStatGameEvent): ITalentPick => {
                        const player = playerList[key];
                        const talentName = getSStatValue(_.m_stringData, 'PurchaseName');
                        const hero = heroData.firstOrDefault(_ => _.name === player.hero);
                        if(!hero || !hero.talents || !hero.talents.length){
                            return <any>{
                                name: talentName,
                                time: _._gameloop / tickRate
                            }
                        }else{}
                        const talentQ = linq.from(hero.talents);
                        return Object.assign({}, talentQ.firstOrDefault(_ => _.name.toUpperCase() === talentName.toUpperCase()), {name: talentName, time: _._gameloop / tickRate});
                    }).toArray()
                }));

            return players.join(
                talentQuery,
                p => p.index,
                e => e.index,
                (p, t): IPlayerTalentChoices => ({
                    playerName: p.name,
                    team: p.team,
                    hero: p.hero,
                    talents: t.talents
                })
            ).toArray();
        })();
    }
}

