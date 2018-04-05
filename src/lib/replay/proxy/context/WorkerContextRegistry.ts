import { Type, isType } from '../../../types';

import { IWorkerCallContext } from './IWorkerCallContext';
import 'reflect-metadata';

export class WorkerContextRegistry {
    private static _contextCallers: Map<string, Type<IWorkerCallContext>> = new Map();


    public static registerContextCaller(type: Type<IWorkerCallContext>): void {
        const id: string = Reflect.getOwnMetadata('workerContext:typeId', type);
        if (WorkerContextRegistry._contextCallers.has(id)) {
            const regType = WorkerContextRegistry._contextCallers.get(id);
            if (regType !== type) {
                throw new Error('Duplicate TypeId');
            }
        } else {
            WorkerContextRegistry._contextCallers.set(id, type);
        }
    }

    public static getContextCallerId(type: IWorkerCallContext | Type<IWorkerCallContext>): string {
        if (!isType(type)) {
            type = type.constructor;
        }
        const id: string = Reflect.getOwnMetadata('workerContext:typeId', type);
        if (WorkerContextRegistry._contextCallers.has(id)) {
            return id;
        }
    }

    public static getContextCallerById(id: string): Type<IWorkerCallContext> {
        return WorkerContextRegistry._contextCallers.get(id);
    }

}
