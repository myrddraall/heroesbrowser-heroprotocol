// tslint:disable:no-bitwise
import { Buffer } from 'buffer';
import { TruncateError } from './errors';
export class BitPackedBuffer {

    private _data: Buffer;
    private _used = 0;
    private _next = null;
    private _nextBits = 0;
    private _bigEndian: boolean;

    public constructor(data: Buffer, endian: 'big' | 'small' = 'big') {
        this._data = data || new Buffer(0);
        this._bigEndian = endian === 'big';
    }


    public toString() {
        return 'buffer(' +
            (this._nextBits && this._next || 0).toString(16) + '/' + this._nextBits +
            ',[' + this._used + ']=' + ((this._used < this._data.length) ? this._data.readUInt8(this._used).toString(16) : '--') +
            ')';
    }

    public get isDone(): boolean {
        return this._nextBits === 0 && this._used >= this._data.length;
    }

    public get size(): number {
        return this._data.length * 8;
    }

    public get usedBits(): number {
        return this._used * 8 - this._nextBits;
    }

    public byteAlign(): void {
        this._nextBits = 0;
    }

    public readAlignedBytes(bytes: number): Buffer {
        this.byteAlign();
        const data = this._data.slice(this._used, this._used + bytes);
        this._used += bytes;
        if (data.length !== bytes) {
            throw new TruncateError(this.toString());
        }
        return data;
    }

    public readBits(bits: number): number {
        let result = 0;
        let resultbits = 0;

        while (resultbits !== bits) {
            if (this._nextBits === 0) {
                if (this.isDone) { throw new TruncateError(this.toString()); }
                this._next = this._data.readUInt8(this._used);
                this._used += 1;
                this._nextBits = 8;
            }

            const copybits = Math.min(bits - resultbits, this._nextBits);
            const copy = this._next & ((1 << copybits) - 1);

            if (this._bigEndian) {
                result |= copy << (bits - resultbits - copybits);
            } else {
                result |= copy << resultbits;
            }
            this._next >>= copybits;
            this._nextBits -= copybits;
            resultbits += copybits;
        }

        return result;
    }

    public readUnalignedBytes(bytes: number): Buffer {
        const buff = new Buffer(bytes);
        for (let i = 0; i < bytes; i += 1) {
            buff.writeUInt8(this.readBits(8), i);
        }
        return buff;
    }
}
