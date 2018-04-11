
export interface ILoadProtocolMessage {
    type: 'load-protocol';
    version: number;
}



export function isLoadProtocolMessage(obj: any): obj is ILoadProtocolMessage {
    return obj.type === 'load-protocol';
}


export interface ILoadProtocolResultMessage {
    type: 'load-protocol-result';
    version: number;
    code: string;
}

export function isLoadProtocolResultMessage(obj: any): obj is ILoadProtocolResultMessage {
    return obj.type === 'load-protocol-result';
}


export interface ILoadHeroDataMessage {
    type: 'load-hero-data';
}

export function isLoadHeroDataMessage(obj: any): obj is ILoadHeroDataMessage {
    return obj.type === 'load-hero-data';
}


export interface ILoadHeroDataResultMessage {
    type: 'load-hero-data-result';
    data: any;
}

export function isLoadHeroDataResultMessage(obj: any): obj is ILoadHeroDataResultMessage {
    return obj.type === 'load-hero-data-result';
}
