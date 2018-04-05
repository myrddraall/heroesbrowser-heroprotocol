// tslint:disable:no-bitwise
import { Buffer } from 'buffer';
import { BitPackedBuffer } from './BitPackedBuffer';
import { CorruptedError } from './errors';
import { AbstractDecoder } from './AbstractDecoder';
import * as Long from 'long';

export class VersionDecoder extends AbstractDecoder {


    public constructor(data: Buffer, typeIfo) {
        super(data, typeIfo);
    }


    public _expectSkip(expected) {
        const r = this._buffer.readBits(8);
        if (r !== expected) { throw new CorruptedError(this.toString()) };
    }

    public _vint() {
        let b = this._buffer.readBits(8);
        const negative = b & 1;
        let result = (b >> 1) & 0x3f;
        let bits = 6;

        while ((b & 0x80) !== 0) {
            b = this._buffer.readBits(8);
            // result |= (b & 0x7f) << bits; // Bitwise operators do not work above 32 bits
            let myLong = new Long;
            myLong = Long.fromString(result.toString(), false);
            result = myLong.or((b & 0x7f) * Math.pow(2, bits)).toString();
            bits += 7;
        }
        result = parseInt(result.toString(), 10);
        return negative ? -result : result;
    };

    public _array(bounds, typeid): any[] {
        this._expectSkip(0);
        const length = this._vint();
        const ar = [];
        for (let i = 0; i < length; i++) {
            ar[i] = this.instance(typeid);
        }
        return ar;
    }

    public _bitarray(bounds): { 0: number, 1: Buffer } {
        this._expectSkip(1);
        const length = this._vint();
        return [length, this._buffer.readAlignedBytes((length + 7) / 8)];
    }

    public _blob(bounds): Buffer {
        this._expectSkip(2);
        const length = this._vint();
        return this._buffer.readAlignedBytes(length);
    }

    public _bool(): boolean {
        this._expectSkip(6);
        return this._buffer.readBits(8) !== 0;
    }

    public _choice(bounds, fields) {
        this._expectSkip(3);
        const tag = this._vint();
        const field = fields[tag];
        if (!field) {
            this._skipInstance();
            return {};
        }
        const ret = {};
        ret[field[0]] = this.instance(field[1]);
        return ret;
    }

    public _fourcc(): Buffer {
        this._expectSkip(7);
        return this._buffer.readAlignedBytes(4);
    }

    public _int(): number {
        this._expectSkip(9);
        return this._vint();
    }

    public _null(): null {
        return null;
    }

    public _optional(typeid): any {
        this._expectSkip(4);
        const exists = this._buffer.readBits(8) !== 0;
        return exists ? this.instance(typeid) : null;
    }

    public _real32(): number {
        this._expectSkip(7);
        return this._buffer.readAlignedBytes(4).readFloatBE(0);
    }

    public _real64(): number {
        this._expectSkip(8);
        return this._buffer.readAlignedBytes(8).readDoubleBE(0);
    }

    public _struct(fields): any {
        function matchTag(tag) {
            return function (field) {
                return tag === field[2];
            };
        }
        this._expectSkip(5);

        let result = {};
        const length = this._vint();

        for (let i = 0; i < length; i += 1) {
            const tag = this._vint();
            const field = fields.find(matchTag(tag));

            if (field) {
                if (field[0] === '__parent') {
                    const parent = this.instance(field[1]);
                    if (parent && typeof parent === 'object' && !Array.isArray(parent)) {
                        result = Object.assign(result, parent);
                    } else if (fields.length === 0) {
                        result = parent;
                    } else {
                        result[field[0]] = parent;
                    }
                } else {
                    result[field[0]] = this.instance(field[1]);
                }
            } else {
                this._skipInstance();
            }
        }
        return result;
    }

    public _skipInstance(): void {
        const skip = this._buffer.readBits(8);
        let length: number;
        let exists: boolean;
        let tag;

        if (skip === 0) {        // array
            length = this._vint();
            for (let i = 0; i < length; i++) {
                this._skipInstance();
            }
        } else if (skip === 1) { // bitblob
            length = this._vint();
            this._buffer.readAlignedBytes((length + 7) / 8);
        } else if (skip === 2) { // blob
            length = this._vint();
            this._buffer.readAlignedBytes(length);
        } else if (skip === 3) { // choice
            tag = this._vint();
            this._skipInstance();
        } else if (skip === 4) { // optional
            exists = this._buffer.readBits(8) !== 0;
            if (exists) { this._skipInstance(); }
        } else if (skip === 5) { // struct
            length = this._vint();
            for (let i = 0; i < length; i += 1) {
                tag = this._vint();
                this._skipInstance();
            }
        } else if (skip === 6) { // u8
            this._buffer.readAlignedBytes(1);
        } else if (skip === 7) { // u32
            this._buffer.readAlignedBytes(4);
        } else if (skip === 8) { // u64
            this._buffer.readAlignedBytes(8);
        } else if (skip === 9) { // vint
            this._vint();
        }
    }
}
