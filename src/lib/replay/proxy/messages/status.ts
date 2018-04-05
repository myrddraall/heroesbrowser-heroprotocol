export interface IReplayStatusMessage {
    type: 'replay-status';
    status: string;
    current?: number;
    total?: number;
}

export function isReplayStatusMessage(obj: any): obj is IReplayStatusMessage {
    return obj.type === 'replay-status' && typeof obj.status === 'string';
}
