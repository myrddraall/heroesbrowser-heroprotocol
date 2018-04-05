import { Buffer } from 'buffer';
import { BitPackedBuffer } from './BitPackedBuffer';
import { CorruptedError } from './errors';

export abstract class AbstractDecoder {

    protected _buffer: BitPackedBuffer;
    protected _typeinfos: any;
    public constructor(data: Buffer, typeIfo) {
        this._buffer = new BitPackedBuffer(data);
        this._typeinfos = typeIfo;
    }

    public toString(): string {
        return this._buffer.toString();
    }

    public instance(typeid) {
        if (typeid >= this._typeinfos.length) { throw new CorruptedError(this.toString()); }

        const typeinfo = this._typeinfos[typeid];
        return this[typeinfo[0]].apply(this, typeinfo[1]);
    }

    public byteAlign(): void {
        this._buffer.byteAlign();
    }

    public get isDone(): boolean {
        return this._buffer.isDone;
    }

    public get usedBits(): number {
        return this._buffer.usedBits;
    }
    public get size(): number {
        return this._buffer.size;
    }
}
