import { IHeroProtocol } from './types';
import { PythonProtocolConverter } from './protocols/PythonProtocolConverter';

export class HeroProtocol {
    public static env = 'production';
    private static _protocols: Map<number, IHeroProtocol> = new Map<number, IHeroProtocol>();
    private static _protocolCode: Map<number, string> = new Map<number, string>();


    public static loadProtocol(protocolVersion: number): Promise<string> {
        const path = `https://raw.githubusercontent.com/Blizzard/heroprotocol/master/protocol${protocolVersion}.py`;
        return new Promise((resolve, reject) => {
            if (HeroProtocol._protocolCode.has(protocolVersion)) {
                resolve(HeroProtocol._protocolCode.get(protocolVersion));
            } else {
                const request = new XMLHttpRequest();
                request.open('GET', path, true);
                request.onload = () => {
                    const p = HeroProtocol.convertProtocolFromPython(protocolVersion, request.responseText);
                    HeroProtocol._protocolCode.set(protocolVersion, p);
                    resolve(p);
                };
                request.onabort = (event) => {
                    reject(event);
                };
                request.onerror = (event) => {
                    reject(event);
                };
                request.send();
            }
        });
    }
    public static async getProtocol(protocolVersion: number): Promise<IHeroProtocol> {
        if (HeroProtocol.hasProtocol(protocolVersion)) {
            return HeroProtocol._protocols.get(protocolVersion);
        }
        const code = await HeroProtocol.loadProtocol(protocolVersion);
        return HeroProtocol.compile(protocolVersion, code);
    }

    public static compile(protocolVersion: number, code: string): IHeroProtocol {
        const protocol = PythonProtocolConverter.compile(code);
        HeroProtocol._protocols.set(protocolVersion, protocol);
        return protocol;
    }

    public static hasProtocol(protocolVersion: number): boolean {
        return HeroProtocol._protocols.has(protocolVersion);
    }

    private static convertProtocolFromPython(version: number, pyCode: string): string {
        const converter = new PythonProtocolConverter(version, pyCode);
        return converter.getCode();
    }


}
