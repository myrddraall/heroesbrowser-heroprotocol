declare var importScripts;
import 'reflect-metadata';
import { WorkerContextRegistry } from './proxy/context/WorkerContextRegistry';
import { IWorkerContextHost } from './proxy/context/IWorkerContextHost';
import { ReplayContextCaller } from './proxy/ReplayContextCaller';
import { ReplayAnalyserContextCaller } from './proxy/ReplayAnalyserContextCaller';
import { Type } from '../types';
import { InvalidExecutionContextError } from './errors'

export function isRunningInWorker(): boolean {
    return typeof importScripts === 'function' && navigator.constructor.name === 'WorkerNavigator';
}
function getPropertyNames(type: Type<any>): Set<string> {
    const props: Set<string> = new Set();
    let proto = type.prototype;
    while (proto && proto.constructor !== Object) {
        Object.getOwnPropertyNames(proto).forEach(n => {
            props.add(n);
        });
        proto = Object.getPrototypeOf(proto);
    }
    return props;
}

function buildProxyObject(callerType: Type<IWorkerContextHost>, proxiedType: Type<any>, ctorArgs: any[]): Object {
    const callerInst = new callerType(...ctorArgs);
    const callerProps = getPropertyNames(callerType);

    let proto = proxiedType.prototype;
    while (proto && proto.constructor !== Object) {
        const props = Object.getOwnPropertyNames(proto);
        for (let i = 0; i < props.length; i++) {
            const prop = props[i];
            if (!callerProps.has(prop)) {
                const desc = Object.getOwnPropertyDescriptor(proto, prop);
                Object.defineProperty(callerInst, prop, desc);
                callerProps.add(prop);
            }
        }
        proto = Object.getPrototypeOf(proto);
    }
    return callerInst;
}

export function WorkerContextCaller(guid: string, proxyType: Type<IWorkerContextHost>): ClassDecorator {
    return <TFunction extends Function>(target: TFunction): TFunction | void => {
        if (isRunningInWorker()) {
            Reflect.defineMetadata('workerContext:typeId', guid, target);
            WorkerContextRegistry.registerContextCaller(<any>target);
            return;
        }
        const original: any = target;
        const f: any = function (...args) {

            const self = buildProxyObject(proxyType, original, args);
            /*Object.getOwnPropertyNames(original.prototype).forEach(name => {
                const sdesc = Object.getOwnPropertyDescriptor(self, name);

                let sFunc = false;
                if (!sdesc) {
                    try {
                        sFunc = typeof self[name] === 'function';
                    } catch (e) {
                        sFunc = true;
                    }
                }
                if (name !== 'constructor' && !sdesc && !sFunc) {
                    const desc = Object.getOwnPropertyDescriptor(original.prototype, name);
                    Object.defineProperty(self, name, desc);
                }
            });*/
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
    const pId = propertyId;
    const fn = function (this: IWorkerContextHost): Promise<any> {
        return this.workerContext.getProperty(this, pId, cacheResult);
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
        get: <any>wrapProxiedGetter(methodNum, true)
    };
    return desc;
}

let callAddress = -1;

export function RunOnWorker<T>(): MethodDecorator {
    return <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void => {
        let proxyMap = Reflect.getOwnMetadata('woker:proxyMethods', target.constructor);
        if (!proxyMap) {
            proxyMap = {};
            Reflect.defineMetadata('woker:proxyMethods', proxyMap, target.constructor);
        }
        const mCount = ++callAddress;
        proxyMap[mCount] = propertyKey;
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

export function WorkerOnly(): MethodDecorator {
    return <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void => {
        if (isRunningInWorker()) {
            return;
        }
        if (descriptor.value) {
            const desc: TypedPropertyDescriptor<T> = {
                value: <any>((...args): any => {
                    throw new InvalidExecutionContextError(`The Method "${propertyKey}" can only be called from the worker context.`);
                })
            }
            return desc;
        }else if (descriptor.get || descriptor.set) {
            const desc: TypedPropertyDescriptor<T> = {};
            const throwFn = <any>((...args): any => {
                throw new InvalidExecutionContextError(`The Property "${propertyKey}" can only be accessed from the worker context.`);
            });
            if(descriptor.get){
                desc.get = throwFn;
            }
            if(descriptor.set){
                desc.set = throwFn;
            }
            return desc;
        }
    }
}
