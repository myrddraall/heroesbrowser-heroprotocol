export interface IWorkerCommand {
    type: 'method' | 'property';
    messageId: number;
    context: string;
    id: number;
}

export function isWorkerCommand(obj: any): obj is IWorkerCommand {
    return 'type' in obj && 'messageId' in obj
        && typeof obj.messageId === 'number'
        && typeof obj.context === 'string' && typeof obj.id === 'number';
}


export interface IWorkerGetPropertyCommand extends IWorkerCommand {
    type: 'property';
}

export function isWorkerGetPropertyCommand(obj: any): obj is IWorkerGetPropertyCommand {
    return isWorkerCommand(obj) && obj.type === 'property';
}


export interface IWorkerCallMethodCommand extends IWorkerCommand {
    type: 'method';
    args: any[];
}

export function isWorkerCallMethodCommand(obj: any): obj is IWorkerCallMethodCommand {
    return isWorkerCommand(obj) && obj.type === 'method';
}


export interface IWorkerCommandResult {
    type: 'command-result';
    messageId: number;
    error?: true;
    result: any;
}

export function isWorkerCommandResult(obj: any): obj is IWorkerCommandResult {
    return obj.type === 'command-result' && typeof obj.messageId === 'number';
}
