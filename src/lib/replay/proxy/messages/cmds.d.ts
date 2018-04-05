export interface IWorkerCommand {
    type: 'method' | 'property';
    messageId: number;
    context: string;
    id: number;
}
export declare function isWorkerCommand(obj: any): obj is IWorkerCommand;
export interface IWorkerGetPropertyCommand extends IWorkerCommand {
    type: 'property';
}
export declare function isWorkerGetPropertyCommand(obj: any): obj is IWorkerGetPropertyCommand;
export interface IWorkerCallMethodCommand extends IWorkerCommand {
    type: 'method';
    args: any[];
}
export declare function isWorkerCallMethodCommand(obj: any): obj is IWorkerCallMethodCommand;
export interface IWorkerCommandResult {
    type: 'command-result';
    messageId: number;
    error?: true;
    result: any;
}
export declare function isWorkerCommandResult(obj: any): obj is IWorkerCommandResult;
