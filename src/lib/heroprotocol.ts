import { IHeroProtocol } from './types';
import { PythonProtocolConverter } from './protocols/PythonProtocolConverter';
import { FailedToLoadProtocolError } from './replay/errors';

export class HeroProtocol {
    public static env = 'development';
    private static _protocols: Map<number, IHeroProtocol> = new Map<number, IHeroProtocol>();
    private static _protocolCode: Map<number, string> = new Map<number, string>();
    private static _heroDataPromise:Promise<any>;

    public static loadProtocol(protocolVersion: number): Promise<string> {
        const path = `https://raw.githubusercontent.com/Blizzard/heroprotocol/master/protocol${protocolVersion}.py`;
        return new Promise((resolve, reject) => {
            if (HeroProtocol._protocolCode.has(protocolVersion)) {
                resolve(HeroProtocol._protocolCode.get(protocolVersion));
            } else {
                const request = new XMLHttpRequest();
                request.open('GET', path, true);
                request.onload = (evt) => {
                    if(request.status === 200){
                        const p = HeroProtocol.convertProtocolFromPython(protocolVersion, request.responseText);
                        HeroProtocol._protocolCode.set(protocolVersion, p);
                        resolve(p);
                    }else{
                        reject(new FailedToLoadProtocolError(protocolVersion, `Failed to load Heroes Protocol ${protocolVersion}`));
                    }
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

    public static loadHeroData(): Promise<any> {
        if(HeroProtocol._heroDataPromise){
            return HeroProtocol._heroDataPromise;
        }
        HeroProtocol._heroDataPromise = new Promise((resolve, reject)=>{
            const request = new XMLHttpRequest();
            const path = '//hotsapi.net/api/v1/heroes';
            request.open('GET', path, true);
            request.onload = () => {
                const data = JSON.parse(request.responseText);
                resolve(data);
            };
            request.onabort = (event) => {
                reject(event);
            };
            request.onerror = (event) => {
                reject(event);
            };
            request.send();
        });
        return HeroProtocol._heroDataPromise;
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

