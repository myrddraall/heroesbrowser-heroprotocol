import { Buffer } from 'buffer';
import { AbstractDecoder } from './AbstractDecoder';
export declare class VersionDecoder extends AbstractDecoder {
    constructor(data: Buffer, typeIfo: any);
    _expectSkip(expected: any): void;
    _vint(): number;
    _array(bounds: any, typeid: any): any[];
    _bitarray(bounds: any): {
        0: number;
        1: Buffer;
    };
    _blob(bounds: any): Buffer;
    _bool(): boolean;
    _choice(bounds: any, fields: any): {};
    _fourcc(): Buffer;
    _int(): number;
    _null(): null;
    _optional(typeid: any): any;
    _real32(): number;
    _real64(): number;
    _struct(fields: any): any;
    _skipInstance(): void;
}
