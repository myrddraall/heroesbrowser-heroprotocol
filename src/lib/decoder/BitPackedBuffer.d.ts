import { Buffer } from 'buffer';
export declare class BitPackedBuffer {
    private _data;
    private _used;
    private _next;
    private _nextBits;
    private _bigEndian;
    constructor(data: Buffer, endian?: 'big' | 'small');
    toString(): string;
    readonly isDone: boolean;
    readonly size: number;
    readonly usedBits: number;
    byteAlign(): void;
    readAlignedBytes(bytes: number): Buffer;
    readBits(bits: number): number;
    readUnalignedBytes(bytes: number): Buffer;
}
