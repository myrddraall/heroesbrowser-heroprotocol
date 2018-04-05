import { Replay } from './Replay';
export interface IMapDescriptor {
    name: string;
    size: IPoint;
}
export interface IPoint {
    x: number;
    y: number;
}
export declare class ReplayMapAnalyser {
    private replay;
    constructor(replay: Replay);
    private readonly trackerQueriable;
    readonly mapName: Promise<string>;
    readonly mapSize: Promise<IPoint>;
    readonly mapDescriptor: Promise<IMapDescriptor>;
    getMinionSpawns(team?: number): Promise<{
        tag: number;
        unitType: string;
        time: number;
        team: number;
        x: number;
        y: number;
    }[]>;
    getMercSpawns(): Promise<{
        tag: number;
        unitType: string;
        time: number;
        x: number;
        y: number;
    }[]>;
    getMinionSpawnHeatmap(team?: number): Promise<{
        value: number;
        x: number;
        y: number;
    }[]>;
}
