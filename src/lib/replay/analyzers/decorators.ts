import { isRunningInWorker } from '../decorators';
import { IReplayAnalyser } from './IReplayAnalyser';
import { ReplayVersionOutOfRangeError } from '../errors';

export function RequiredReplayVersion(version: number | string, customMessage?: string): MethodDecorator {
    return <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void => {
        if (!isRunningInWorker()) {
            return;
        }
        const reqVer: string = typeof version === 'number' ? '>=' + version : version;
        if (descriptor.value) {
            const oFn:Function = <any>descriptor.value;
            const checkFn = function (this: IReplayAnalyser, ...args: any[]) {
                if (!this.versionMatches(reqVer)) {
                    throw new ReplayVersionOutOfRangeError(customMessage || 'Method not supported by this version of replay');
                }
                return oFn.apply(this, args);
            };
            return {
                value: <any>checkFn
            }
        }else if(descriptor.get){
            const oFn:Function = <any>descriptor.get;
            const checkFn = function (this: IReplayAnalyser) {
                if (!this.versionMatches(reqVer)) {
                    throw new ReplayVersionOutOfRangeError(customMessage || 'Property not supported by this version of replay');
                }
                return oFn.apply(this);
            };
            return {
                get: checkFn
            }
        }
    }
}