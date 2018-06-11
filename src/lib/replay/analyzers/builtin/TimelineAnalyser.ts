
import { ReplayAnalyserContext, RunOnWorker } from '../../decorators';
import { Replay } from '../../Replay';
import { IReplayTrackerEvent, isSScoreResultEvent, ISScoreResultEvent, isSGameUserLeaveEvent, isSGameUserJoinEvent, UserLeaveReason, ISGameUserLeaveEvent, ISGameUserJoinEvent, ISStatGameEvent, isSStatGameEvent, getSStatValue, isSUnitDiedEvent, isSUnitRevivedEvent, isSUnitBornEvent } from '../../../types';
import * as linq from 'linq';
import { BasicReplayAnalyser } from './BasicReplayAnalyser'
import { AbstractReplayAnalyser } from '../AbstractReplayAnalyser';
import { RequiredReplayVersion } from '../decorators';
import { ReplayVersionOutOfRangeError } from "../../errors";

import { UnitAnalyser } from './UnitAnalyser';
import { TimelinePlayerEvent, TimelineEvent, TimelinePlayerLevelEvent, TimelinePlayerTalentEvent } from '..';


@ReplayAnalyserContext('BC5D3D41-7D0E-4B01-8658-AFB219F69A4B')
export class TimelineAnalyser extends AbstractReplayAnalyser {
    private basicReplayAnalyser: BasicReplayAnalyser;
    private unitAnalyser: UnitAnalyser;
    public constructor(replay: Replay) {
        super(replay);
    }

    public async initialize(): Promise<void> {
        await super.initialize();
        this.basicReplayAnalyser = new BasicReplayAnalyser(this.replay);
        this.unitAnalyser = new UnitAnalyser(this.replay);
        await Promise.all([
            this.basicReplayAnalyser.initialize(),
            this.unitAnalyser.initialize()
        ]);
    }


    @RunOnWorker()
    public async getTimlineLifeSpanEvents(): Promise<TimelineEvent[]> {
        const tracker = await this.trackerEventsQueriable;
        const protocol = await this.replay.protocol;
        const unitTypes = await this.unitAnalyser.unitTypeById;
        const playerSpawnById = await this.unitAnalyser.playerSpawnById;
        const gameDur = await this.basicReplayAnalyser.gameDurationTicks;
        const players = await this.basicReplayAnalyser.playerList;
        const playerLifeEvents = tracker
            .where(_ => {
                if (isSStatGameEvent(_)) {
                    switch (_.m_eventName) {
                        case 'PlayerSpawned':
                            return true;
                        case 'PlayerDeath':
                            const player = players[getSStatValue(_.m_intData, 'PlayerID') - 1];
                            if (player.hero === 'Leoric')
                                return false;
                            return true;
                    }
                }
                if (isSUnitRevivedEvent(_)) {
                    const id = protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle);
                    const type = unitTypes[id];
                    if (type.startsWith('Hero')) {
                        return true;
                    }
                }
                return false;
            }).select(_ => {
                if (isSStatGameEvent(_)) {
                    if (_.m_eventName === 'PlayerSpawned') {
                        return {
                            type: 'player_alive',
                            time: _._gameloop,
                            playerIndex: getSStatValue(_.m_intData, 'PlayerID') - 1
                        };
                    }
                    return {
                        type: 'player_dead',
                        time: _._gameloop,
                        playerIndex: getSStatValue(_.m_intData, 'PlayerID') - 1
                    };
                } else if (isSUnitRevivedEvent(_)) {
                    const id = protocol.unitTag(_.m_unitTagIndex, _.m_unitTagRecycle);
                    const spawn = playerSpawnById[id];
                    return {
                        type: 'player_alive',
                        time: _._gameloop,
                        playerIndex: spawn.m_controlPlayerId - 1
                    };
                }
            }).toArray();

        const playerEvents: Array<Array<TimelinePlayerEvent>> = [];
        const playerLifeResult: Array<TimelinePlayerEvent> = [];

        for (let i = 0; i < playerLifeEvents.length; i++) {
            const event = playerLifeEvents[i];
            if (!playerEvents[event.playerIndex]) {
                playerEvents[event.playerIndex] = [];
            }
            const playerEvts = playerEvents[event.playerIndex];
            const stateType = event.type;
            const oldEvent = playerEvts.length ? playerEvts[playerEvts.length - 1] : undefined;
            const oldState = oldEvent ? oldEvent.eventType : undefined;
            //const currentState = playerStates[event.playerIndex] ? playerStates[event.playerIndex].type : undefined;

            const newEvent: TimelinePlayerEvent = {
                eventGroup: 'player',
                eventType: event.type,
                playerIndex: event.playerIndex,
                start: event.time,
                end: undefined,
            }
            playerEvts.push(newEvent);
            playerLifeResult.push(newEvent);
            if (oldState !== undefined) {
                oldEvent.end = newEvent.start;
            } else {
                newEvent.start = 0;
            }
        }

        for (let i = 0; i < playerEvents.length; i++) {
            const playerEvts = playerEvents[i];
            const last = playerEvts[playerEvts.length - 1];
            last.end = gameDur;
        }
        return playerLifeResult;
    }


    public async getTimlineDeathEvents(): Promise<TimelinePlayerEvent[]> {
        const tracker = await this.trackerEventsQueriable;

        const playerDeaths = tracker.where(_ => isSStatGameEvent(_) && _.m_eventName === 'PlayerDeath')
            .select((_: ISStatGameEvent): TimelinePlayerEvent => ({
                playerIndex: getSStatValue(_.m_intData, 'PlayerID') - 1,
                eventGroup: 'player',
                eventType: 'player_death',
                start: _._gameloop,
                end: undefined
            }));

        return playerDeaths.toArray();
    }

    @RunOnWorker()
    public async getTimlineLevelEvents(): Promise<TimelinePlayerTalentEvent[]> {
        const tracker = await this.trackerEventsQueriable;

        const playerDeaths = tracker.where(_ => isSStatGameEvent(_) && _.m_eventName === 'LevelUp')
            .select((_: ISStatGameEvent): TimelinePlayerTalentEvent => ({
                playerIndex: getSStatValue(_.m_intData, 'PlayerID') - 1,
                eventGroup: 'player',
                eventType: 'player_level',
                start: _._gameloop,
                talent: getSStatValue(_.m_stringData, 'PurchaseName'),
                end: undefined
            }));

        return playerDeaths.toArray();
    }

    
    @RunOnWorker()
    public async getTimlineTalentEvents(): Promise<TimelinePlayerLevelEvent[]> {
        const tracker = await this.trackerEventsQueriable;

        const playerDeaths = tracker.where(_ => isSStatGameEvent(_) && _.m_eventName === 'TalentChosen')
            .select((_: ISStatGameEvent): TimelinePlayerLevelEvent => ({
                playerIndex: getSStatValue(_.m_intData, 'PlayerID') - 1,
                eventGroup: 'player',
                eventType: 'player_talent',
                start: _._gameloop,
                level: getSStatValue(_.m_intData, 'Level'),
                end: undefined
            }));

        return playerDeaths.toArray();
    }

    @RunOnWorker()
    public async getTimlineEvents(): Promise<TimelineEvent[]> {
        const events: TimelineEvent[] = [
            ...await this.getTimlineLifeSpanEvents(),
            ...await this.getTimlineDeathEvents(),
            ...await this.getTimlineLevelEvents(),
            ...await this.getTimlineLevelEvents()
        ];

        return events;
    }


    @RunOnWorker()
    public async getTestUnitData() {
        const protocol = await this.replay.protocol;
        const q = await this.trackerEventsQueriable;
        return q.where(_ => _['m_unitTagIndex'] !== undefined).groupBy(_ => protocol.unitTag(_['m_unitTagIndex'], _['m_unitTagRecycle']), _ => _, (key, gq) => {
            return {
                id: key,
                events: gq.toArray()
            }
        }).toArray();
    }

}

