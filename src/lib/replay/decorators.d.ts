import 'reflect-metadata';
import { IWorkerContextHost } from './proxy/context/IWorkerContextHost';
import { Type } from '../types';
export declare function WorkerContextCaller(guid: string, proxyType: Type<IWorkerContextHost>): ClassDecorator;
export declare function ReplayWorkerContext(guid: string): ClassDecorator;
export declare function ReplayAnalyserContext(guid: string): ClassDecorator;
export declare function RunOnWorker<T>(): MethodDecorator;
