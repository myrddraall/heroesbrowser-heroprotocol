
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import { IReplayTrackerEvent, isSScoreResultEvent, ISScoreResultEvent } from '../../../types';
import * as linq from 'linq';
import { BasicReplayAnalyser } from './BasicReplayAnalyser'
import { ReplayVersionOutOfRangeError } from "../../errors"
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { ReplayAttributeHelper } from '../../util/ReplayAttributeHelper';
import { HeroRole } from '../types';

export enum SlotType {
    EMPTY,
    PLAYER,
    OBSERVER,
    AI
}


interface ISlotInfo {
    index: number;
    // from initData.m_syncLobbyState.m_lobbyState.m_slots

    m_announcerPack: string;
    m_banner: string;
    m_control: number; // 0?? 2: player
    m_hasSilencePenalty: boolean;
    m_hasVoiceSilencePenalty: boolean;
    m_heroHandle: string;
    m_mount: string;
    m_observe: number;
    m_skin: string;
    m_spray: string;
    m_teamId: number;
    m_toonHandle: string;
    m_userId: number;
    m_voiceLine: string;
    m_workingSetSlotId: number;
    // from initData.m_syncLobbyState.m_userInitialData
    m_name: string;
    // details.m_playerList
    m_toon_id: number;
    m_programId: string;
    m_realm: number;
    m_region: number;
    m_result: number;
    m_hero: string;
}

export interface IPlayerSlot {
    type: SlotType;
    id: number;
    index: number;
    realm: number;
    region: number;
    handle: string;
    userId: number;
    won: boolean;
    slot: number;
    name: string;
    team: number;
    hero: string;
    role: HeroRole;
    heroHandle: string;
    skin: string;
    mount: string;
    spray: string;
    announcerPack: string;
    banner: string;
    voiceLine: string;
    hasChatSilence: boolean;
    hasVoiceSilence: boolean;
}

@ReplayAnalyserContext('09E13E2D-581E-4929-AEDA-FE8DA3FF3ACF')
export class PlayerAnalyser extends AbstractReplayAnalyser {

    public constructor(replay: Replay) {
        super(replay);
    }


    @RunOnWorker()
    public get playerSlotData(): Promise<IPlayerSlot[]> {
        return (async (): Promise<IPlayerSlot[]> => {
            const initData = await this.initData;
            const details = await this.details;
            const attrib = new ReplayAttributeHelper(await this.attributeEvents);
            const slotInfo: Partial<ISlotInfo>[] = [];

            // all slots inc obs, has skin
            const lobbySlots = initData.m_syncLobbyState.m_lobbyState.m_slots;

            // has usernames contains names, joined on index -> m_lobbyState.m_slots.userId
            const userInit = initData.m_syncLobbyState.m_userInitialData;

            // only actual players od the game, conatains  realm and region info and game result
            const detailPlayerlist = details.m_playerList;

            for (let i = 0; i < 10; i++) {
                const slot = lobbySlots[i];

                const info: Partial<ISlotInfo> = {
                    index: i,
                    m_announcerPack: slot.m_announcerPack,
                    m_banner: slot.m_banner,
                    m_control: slot.m_control,
                    m_hasSilencePenalty: slot.m_hasSilencePenalty,
                    m_hasVoiceSilencePenalty: slot.m_hasVoiceSilencePenalty,
                    m_heroHandle: slot.m_hero,
                    m_mount: slot.m_mount,
                    m_observe: slot.m_observe,
                    m_skin: slot.m_skin,
                    m_spray: slot.m_spray,
                    m_teamId: slot.m_teamId,
                    m_toonHandle: slot.m_toonHandle,
                    m_userId: slot.m_userId,
                    m_voiceLine: slot.m_voiceLine,
                    m_workingSetSlotId: slot.m_workingSetSlotId,
                    m_name: slot.m_userId !== null ? userInit[slot.m_userId].m_name : null
                };
                slotInfo.push(info);
            }

            const slotInfoQ = linq.from(slotInfo);

            for (let i = 0; i < detailPlayerlist.length; i++) {
                const detail = detailPlayerlist[i];
                const slot = slotInfoQ.singleOrDefault(_ => _.m_workingSetSlotId === detail.m_workingSetSlotId);
                if (slot) {
                    slot.m_toon_id = detail.m_toon.m_id;
                    slot.m_programId = detail.m_toon.m_programId;
                    slot.m_realm = detail.m_toon.m_realm;
                    slot.m_region = detail.m_toon.m_region;
                    slot.m_result = detail.m_result;
                    slot.m_hero = detail.m_hero;
                }
            }

            const slotList: IPlayerSlot[] = slotInfoQ
                .orderBy(_ => _.m_workingSetSlotId)
                .select(_ => {
                    let slotType: SlotType;
                    if (_.m_toonHandle && _.m_observe == 1) {
                        slotType = SlotType.OBSERVER;
                    } else if (_.m_toonHandle) {
                        slotType = SlotType.PLAYER;
                    } else if (_.m_hero) {
                        slotType = SlotType.AI;
                    }
                    else {
                        slotType = SlotType.EMPTY;
                    }
                    const slot: IPlayerSlot = {
                        type: slotType,
                        id: _.m_toon_id,
                        index: _.index,
                        realm: _.m_realm,
                        region: _.m_region,
                        handle: _.m_toonHandle,
                        userId: _.m_userId,
                        won: _.m_result === 1,
                        slot: _.m_workingSetSlotId,
                        name: _.m_name,
                        team: slotType === SlotType.PLAYER || slotType === SlotType.AI ? _.m_teamId : -1,
                        hero: _.m_hero,
                        role: attrib.getPlayerRole(_.index),
                        heroHandle: _.m_heroHandle,
                        skin: _.m_skin,
                        mount: _.m_mount,
                        spray: _.m_spray,
                        announcerPack: _.m_announcerPack,
                        banner: _.m_banner,
                        voiceLine: _.m_voiceLine,
                        hasChatSilence: _.m_hasSilencePenalty,
                        hasVoiceSilence: _.m_hasVoiceSilencePenalty
                    };
                    console.log(slot);
                    return slot;
                })
                .toArray();
            return slotList;
        })();
    }


}

