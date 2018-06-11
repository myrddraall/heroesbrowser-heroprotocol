export interface TimelineEvent {
    eventGroup: string;
    eventType: string;
    start: number;
    end: number;
}

export interface TimelineTeamEvent extends TimelineEvent {
    eventGroup: 'team',
    teamIndex: number;
}

export function isTimelineTeamEvent(obj: any): obj is TimelineTeamEvent {
    return 'eventGroup' in obj && obj.eventGroup === 'team';
}

export interface TimelinePlayerEvent extends TimelineEvent {
    eventGroup: 'player',
    playerIndex: number;
}

export interface TimelinePlayerLevelEvent extends TimelinePlayerEvent {
    level: number;
}

export interface TimelinePlayerTalentEvent extends TimelinePlayerEvent {
    talent: string;
}

export function isTimelinePlayerEvent(obj: any): obj is TimelinePlayerEvent {
    return 'eventGroup' in obj && obj.eventGroup === 'player';
}