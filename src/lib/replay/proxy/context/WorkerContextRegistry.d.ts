import { Type } from '../../../types';
import { IWorkerCallContext } from './IWorkerCallContext';
import 'reflect-metadata';
export declare class WorkerContextRegistry {
    private static _contextCallers;
    static registerContextCaller(type: Type<IWorkerCallContext>): void;
    static getContextCallerId(type: IWorkerCallContext | Type<IWorkerCallContext>): string;
    static getContextCallerById(id: string): Type<IWorkerCallContext>;
}
