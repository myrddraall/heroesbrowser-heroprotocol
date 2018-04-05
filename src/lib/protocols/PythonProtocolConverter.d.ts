import { IHeroProtocol } from '../types';
export declare class PythonProtocolConverter {
    private version;
    private pyCode;
    private typeinfos;
    private gameeventsTypes;
    private messageeventsTypes;
    private trackereventstypes;
    private gameeventsTypeid;
    private messageeventsTypeid;
    private trackereventsTypeid;
    private headerTypeid;
    private detailsTypeid;
    private initdataTypeid;
    static compile(protocolCode: string): IHeroProtocol;
    constructor(version: number, pyCode: string);
    convert(): IHeroProtocol;
    getCode(): string;
    private parse(raw);
    private parseEvent(str);
    private parseTypeinfos(str);
    private write();
}
