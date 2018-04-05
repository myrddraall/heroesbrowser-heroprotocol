import { Buffer } from 'buffer';
import { BitPackedBuffer } from './BitPackedBuffer';
import { CorruptedError } from './errors';
import { AbstractDecoder } from './AbstractDecoder';


export class BitPackedDecoder extends AbstractDecoder {

    public constructor(data: Buffer, typeIfo) {
        super(data, typeIfo);
    }

    public _array(bounds, typeid): any[] {
        const length = this._int(bounds);
        const ar = [];
        for (let i = 0; i < length; i += 1) {
            ar[i] = this.instance(typeid);
        }
        return ar;
    }

    public _bitarray(bounds): number[] {
        const length = this._int(bounds);
        return [length, this._buffer.readBits(length)];
    }

    public _blob(bounds): Buffer {
        const length = this._int(bounds);
        return this._buffer.readAlignedBytes(length);
    }

    public _bool(): boolean {
        return this._int([0, 1]) !== 0;
    }

    public _choice(bounds, fields) {
        const tag = this._int(bounds);
        const field = fields[tag];
        if (!field) { throw new CorruptedError(this.toString()); }
        const ret = {};
        ret[field[0]] = this.instance(field[1]);
        return ret;
    }

    public _fourcc(): Buffer {
        return this._buffer.readUnalignedBytes(4);
    }

    public _int(bounds): number {
        const value = bounds[0] + this._buffer.readBits(bounds[1]);
        return value;
    }

    public _null(): null {
        return null;
    }

    public _optional(typeid): any | null {
        const exists = this._bool();
        return exists ? this.instance(typeid) : null;
    }

    public _real32(): number {
        return this._buffer.readUnalignedBytes(4).readFloatBE(0);
    }

    public _real64(): number {
        return this._buffer.readUnalignedBytes(8).readDoubleBE(0);
    }

    public _struct(fields): any {
        let result = {};
        fields.forEach(field => {
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
        });
        return result;
    }


}
