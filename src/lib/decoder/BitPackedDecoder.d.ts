import { Buffer } from 'buffer';
import { AbstractDecoder } from './AbstractDecoder';
export declare class BitPackedDecoder extends AbstractDecoder {
    constructor(data: Buffer, typeIfo: any);
    _array(bounds: any, typeid: any): any[];
    _bitarray(bounds: any): number[];
    _blob(bounds: any): Buffer;
    _bool(): boolean;
    _choice(bounds: any, fields: any): {};
    _fourcc(): Buffer;
    _int(bounds: any): number;
    _null(): null;
    _optional(typeid: any): any | null;
    _real32(): number;
    _real64(): number;
    _struct(fields: any): any;
}
