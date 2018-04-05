declare var importScripts;
import 'reflect-metadata';
import { WorkerContextRegistry } from './proxy/context/WorkerContextRegistry';
import { IWorkerContextHost } from './proxy/context/IWorkerContextHost';
import { ReplayContextCaller } from './proxy/ReplayContextCaller';
import { ReplayAnalyserContextCaller } from './proxy/ReplayAnalyserContextCaller';
import { Type } from '../types';

function isRunningInWorker(): boolean {
    return typeof importScripts === 'function' && navigator.constructor.name === 'WorkerNavigator';
}

function addProtoIfRequired(obj: any, protoToAdd: any) {
    let proto = obj['__proto__'];
    while (proto) {
        const nextProto = proto['__proto__'];
        if (nextProto) {
            if (nextProto === protoToAdd) {
                return;
            }
            if (nextProto.constructor === Object) {
                proto['__proto__'] = protoToAdd;
                return;
            }
        }
        proto = nextProto;
    }
}

export function WorkerContextCaller(guid: string, proxyType: Type<IWorkerContextHost>): ClassDecorator {
    return <TFunction extends Function>(target: TFunction): TFunction | void => {
        if (isRunningInWorker()) {
            Reflect.defineMetadata('workerContext:typeId', guid, target);
            WorkerContextRegistry.registerContextCaller(<any>target);
            return;
        }
        const original = target;
        const f: any = function (...args) {
            const self = new proxyType(...args);
            addProtoIfRequired(self, original.prototype);
            /* const proto = findProtoBeforeObject(self);
             proto['__proto__'] = original.prototype;
             */
            Reflect.defineMetadata('workerContext:typeId', guid, self.constructor);
            WorkerContextRegistry.registerContextCaller(<Type<any>>self.constructor);
            return self;
        };
        f.prototype = original.prototype;
        return f;
    };
}

export function ReplayWorkerContext(guid: string): ClassDecorator {
    return WorkerContextCaller(guid, ReplayContextCaller);
}

export function ReplayAnalyserContext(guid: string): ClassDecorator {
    return WorkerContextCaller(guid, ReplayAnalyserContextCaller);
}





function wrapProxiedMethod<T>(methodId: number, cacheResult: boolean): () => Promise<any> {
    const fn = function (this: IWorkerContextHost, ...args: any[]) {
        return this.workerContext.callMethod(this, methodId, args, cacheResult);
    };
    return fn;
}

function wrapProxiedGetter(propertyId: number, cacheResult: boolean): () => Promise<any> {
    const fn = function (this: IWorkerContextHost): Promise<any> {
        return this.workerContext.getProperty(this, propertyId, cacheResult);
    };
    return fn;
}



function buildWorkerPoxyMethod<T>(
    target: Object,
    methodNum: number,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
    const type = Reflect.getMetadata('design:returnType', target, propertyKey);
    /*if (!(type === Promise || type.prototype instanceof Promise)) {
        throw new Error(`Method "${propertyKey}" must return a promise.`);
    }*/

    return <TypedPropertyDescriptor<T>>{
        enumerable: descriptor.enumerable,
        writable: descriptor.writable,
        value: <any>wrapProxiedMethod(methodNum, true)
    };
}

function buildWorkerPoxyGetterProperty<T>(
    target: Object,
    methodNum: number,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
    if (descriptor.set) {
        throw Error(`Cannot wrap setter "${propertyKey}". Only readonly properties are supported.`);
    }

    const type = Reflect.getMetadata('design:type', target, propertyKey);
    /*if (!(type === Promise || type.prototype instanceof Promise)) {
        throw new Error(`Property "${propertyKey}" must return a promise.`);
    }*/
    const desc = <TypedPropertyDescriptor<T>>{

        //enumerable: descriptor.enumerable,
        // writable: descriptor.writable,
        get: <any>wrapProxiedGetter(methodNum, true)
    };
    return desc;
}

export function RunOnWorker<T>(): MethodDecorator {
    return <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void => {
        let proxyMap = Reflect.getOwnMetadata('woker:proxyMethods', target.constructor);
        if (!proxyMap) {
            proxyMap = [];
            Reflect.defineMetadata('woker:proxyMethods', proxyMap, target.constructor);
        }
        const mCount = proxyMap.length;
        proxyMap.push(propertyKey);
        // Reflect.defineMetadata('woker:methodCount', mCount, target.constructor);
        //Reflect.defineMetadata('woker:methodNum', mCount, target.constructor, propertyKey);

        if (isRunningInWorker()) {
            return;
        }

        if (typeof (descriptor.value) === 'function') {
            return buildWorkerPoxyMethod(target, mCount, propertyKey, descriptor);
        } else {
            return buildWorkerPoxyGetterProperty(target, mCount, propertyKey, descriptor);
        }
    };
}
/*
export function ReplayAnalizer(): ClassDecorator {
    return (target) => {
        if (typeof (importScripts) === 'function' && navigator.constructor.name === 'WorkerNavigator') {
            return target;
        }

        const original = target;
        const f: any = function (...args) {

            //return original.apply(this, args);
        };
        f.prototype = original.prototype;
        return f;
    };
}
*/