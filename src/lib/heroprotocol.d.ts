import { IHeroProtocol } from './types';
export declare class HeroProtocol {
    private static _protocols;
    private static _protocolCode;
    static loadProtocol(protocolVersion: number): Promise<string>;
    static getProtocol(protocolVersion: number): Promise<IHeroProtocol>;
    static compile(protocolVersion: number, code: string): IHeroProtocol;
    static hasProtocol(protocolVersion: number): boolean;
    private static convertProtocolFromPython(version, pyCode);
}
