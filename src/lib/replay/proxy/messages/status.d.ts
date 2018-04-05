export interface IReplayStatusMessage {
    type: 'replay-status';
    status: string;
    current?: number;
    total?: number;
}
export declare function isReplayStatusMessage(obj: any): obj is IReplayStatusMessage;
