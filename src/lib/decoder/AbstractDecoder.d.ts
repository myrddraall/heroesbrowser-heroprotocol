import { Buffer } from 'buffer';
import { BitPackedBuffer } from './BitPackedBuffer';
export declare abstract class AbstractDecoder {
    protected _buffer: BitPackedBuffer;
    protected _typeinfos: any;
    constructor(data: Buffer, typeIfo: any);
    toString(): string;
    instance(typeid: any): any;
    byteAlign(): void;
    readonly isDone: boolean;
    readonly usedBits: number;
    readonly size: number;
}
