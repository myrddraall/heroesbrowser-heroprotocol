import { Replay } from '../Replay';

export interface IReplayAnalyserContructor {
    new(replay: Replay): IReplayAnalyser;

}

export interface IReplayAnalyser {
    dispose(): void;
    initialize(): Promise<void>;
    versionMatches(semVer:string):boolean;
}