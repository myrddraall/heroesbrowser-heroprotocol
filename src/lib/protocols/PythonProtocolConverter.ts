
import * as decoders from './decoders';
import { IHeroProtocol } from '../types';
const _template = `
    "use strict";

    const progress = {
        current: -1,
        total: -1
    }
    exports.progress = progress;

    exports.version = \${version};
    \${patch}

    const BitPackedDecoder = decoders.BitPackedDecoder;
    const VersionDecoder = decoders.VersionDecoder;


    // Decoding instructions for each protocol type.
    const typeinfos = [
    \${typeinfos}
    ];

    // Map from protocol NNet.Game.*Event eventid to [typeid, name]
    const game_event_types = {
    \${gameeventsTypes}
    };

    // The typeid of the NNet.Game.EEventId enum.
    const game_eventid_typeid = \${gameeventsTypeid};

    // Map from protocol NNet.Game.*Message eventid to [typeid, name]
    const message_event_types = {
    \${messageeventsTypes}
    };

    // The typeid of the NNet.Game.EMessageId enum.
    const message_eventid_typeid = \${messageeventsTypeid};

    // Map from protocol NNet.Replay.Tracker.*Event eventid to [typeid, name]
    const tracker_event_types = {
    \${trackereventstypes}
    };

    // The typeid of the NNet.Replay.Tracker.EEventId enum.
    const tracker_eventid_typeid = \${trackereventsTypeid};

    // The typeid of NNet.SVarUint32 (the type used to encode gameloop deltas).
    const svaruint32_typeid = 7;

    // The typeid of NNet.Replay.SGameUserId (the type used to encode player ids).
    const replay_userid_typeid = 8;

    // The typeid of NNet.Replay.SHeader (the type used to store replay game version and length).
    const replay_header_typeid = \${headerTypeid};

    // The typeid of NNet.Game.SDetails (the type used to store overall replay details).
    const game_details_typeid = \${detailsTypeid};

    // The typeid of NNet.Replay.SInitData (the type used to store the inital lobby).
    const replay_initdata_typeid = \${initdataTypeid};

    // not sure if correct port
    function _varuint32Value(value) {
    // Returns the numeric value from a SVarUint32 instance.
    return value[Object.keys(value)[0]];
    }

    function* _decode_event_stream(decoder, eventidTypeid, eventTypes, decodeUserId) {
    // Decodes events prefixed with a gameloop and possibly userid
    var gameloop = 0;
    while (!decoder.isDone) {
        
        var startBits = decoder.usedBits;

        // decode the gameloop delta before each event
        var delta = _varuint32Value(decoder.instance(svaruint32_typeid));
        gameloop += delta;

        // decode the userid before each event
        var userid = (decodeUserId === true) ? decoder.instance(replay_userid_typeid) : undefined;

        // decode the event id
        var eventid = decoder.instance(eventidTypeid);
        var eventType = eventTypes[eventid] || [null, null];
        var typeid = eventType[0];
        var typename = eventType[1];
        if (typeid === null) throw new decoders.CorruptedError('eventid(' + eventid + ') at ' + decoder.toString());

        // decode the event struct instance
        var event = decoder.instance(typeid);
        event._event = typename;
        event._eventid = eventid;

        // insert gameloop and userid
        event._gameloop = gameloop;
        if (decodeUserId) event._userid = userid;

        // the next event is byte aligned
        decoder.byteAlign();

        // insert bits used in stream
        event._bits = decoder.usedBits - startBits;
        progress.current = decoder.usedBits;
        yield event;
    }
    }

    exports.decodeReplayGameEvents = function* (contents) {
    // Decodes and yields each game event from the contents byte string.
    const decoder = new BitPackedDecoder(contents, typeinfos);
    progress.current = 0;
    progress.total = decoder.size;
    for (let event of _decode_event_stream(decoder, game_eventid_typeid, game_event_types, true))
        yield event;
    };

    exports.decodeReplayMessageEvents = function* (contents) {
        // Decodes and yields each message event from the contents byte string.
        const decoder = new BitPackedDecoder(contents, typeinfos);
        progress.current = 0;
        progress.total = decoder.size;
        for (let event of _decode_event_stream(decoder, message_eventid_typeid, message_event_types, true))
            yield event;
    };

    exports.decodeReplayTrackerEvents = function* (contents) {
    // Decodes and yields each tracker event from the contents byte string.
    const decoder = new VersionDecoder(contents, typeinfos);
    progress.current = 0;
    progress.total = decoder.size;
    for (let event of _decode_event_stream(decoder, tracker_eventid_typeid, tracker_event_types, false))
        yield event;
    };

    exports.decodeReplayHeader = function(contents) {
    // Decodes and return the replay header from the contents byte string.
    const decoder = new VersionDecoder(contents, typeinfos);
    return decoder.instance(replay_header_typeid);
    };

    exports.decodeReplayDetails = function(contents) {
    // Decodes and returns the game details from the contents byte string.
    const decoder = new VersionDecoder(contents, typeinfos);
    return decoder.instance(game_details_typeid);
    };

    exports.decodeReplayInitdata = function(contents) {
    // Decodes and return the replay init data from the contents byte string.
    const decoder = new BitPackedDecoder(contents, typeinfos);
    return decoder.instance(replay_initdata_typeid);
    };

    exports.decodeReplayAttributesEvents = function (contents) {
    // Decodes and yields each attribute from the contents byte string.
    const buffer = new decoders.BitPackedBuffer(contents, 'little');
    progress.current = 0;
    progress.total = buffer.size;
    const attributes = {};

    if (!buffer.isDone) {
        attributes.source = buffer.readBits(8);
        attributes.mapNameSpace = buffer.readBits(32);
        var count = buffer.readBits(32);
        attributes.scopes = {};

        while (!buffer.isDone) {
        var value = {};
        value.namespace = buffer.readBits(32);
        var attrid = value.attrid = buffer.readBits(32);
        var scope = buffer.readBits(8);
        value.value = buffer.readAlignedBytes(4).reverse();
        while (value.value[0] === 0) value.value = value.value.slice(1);
        while (value.value[value.value.length - 1] === 0) value.value = value.value.slice(0, -1);
        if (!attributes.scopes[scope])
            attributes.scopes[scope] = {};
        if (!attributes.scopes[scope][attrid])
            attributes.scopes[scope][attrid] = [];
        attributes.scopes[scope][attrid].push(value);
        progress.current = buffer.usedBits;
        }
    }

    return attributes;
    };

    exports.unitTag = function(unitTagIndex, unitTagRecycle) {
    return (unitTagIndex << 18) + unitTagRecycle;
    };

    exports.unitTagIndex = function(unitTag) {
    return (unitTag >> 18) & 0x00003FFF;
    };

    exports.unitTagRecycle = function(unitTag) {
    return unitTag & 0x0003FFFF;
    };
`;


const types = {
    tuple: function (str) {
        return str.match(/(-?\w+)/g);
    },
    tuples: function (str) {
        return str.match(/(\(.*?\))/g);
    },
    _int: {
        decode: function (str) {
            const ret = {};
            const res = types.tuple(str);
            ret['bounds'] = [res[0], res[1]];
            return ret;
        },
        encode: function (infos) {
            return `[${infos.bounds[0]}, ${infos.bounds[1]}]`;
        }
    },
    _choice: {
        decode: function (str) {
            const ret = { bounds: [], choices: [] };
            const res = types.tuples(str);

            Object.assign(ret, types._int.decode(res[0]));
            for (let i = 1; i < res.length; i += 1) {
                const tuple = types.tuple(res[i]);
                ret.choices.push({
                    label: tuple[0],
                    typeIndex: tuple[1]
                });
            }
            return ret;
        },
        encode: function (infos) {
            return `[${infos.bounds[0]}, ${infos.bounds[1]}], { ${infos.choices.map((choice, index, ar) => {
                return `${index}: ['${choice.label}', ${choice.typeIndex}]${(index === ar.length - 1) ? '' : ', '}`;
            }).join('')}}`;
        }
    },
    _struct: {
        decode: function (str) {
            const ret = { items: [] };
            const tuples = types.tuples(str);
            if (tuples) {
                tuples.forEach(tuple => {
                    tuple = types.tuple(tuple);
                    ret.items.push({
                        label: tuple[0],
                        typeIndex: tuple[1],
                        tag: tuple[2]
                    });
                });
            }
            return ret;
        },
        encode: function (infos) {
            return `[${infos.items.map((item, index, ar) => {
                return `['${item.label}', ${item.typeIndex}, ${item.tag}]${(index === ar.length - 1) ? '' : ', '}`;
            }).join('')}]`;
        }
    },
    _blob: {
        decode: function (str) {
            return types._int.decode(str);
        },
        encode: function (infos) {
            return types._int.encode(infos);
        }
    },
    _bool: {
        decode: function (str) {
            return {};
        },
        encode: function (infos) {
            return '';
        }
    },
    _array: {
        decode: function (str) {
            return Object.assign(
                { typeIndex: str.match(/\d+$/)[0] },
                types._int.decode(str)
            );
        },
        encode: function (infos) {
            return `[${infos.bounds[0]}, ${infos.bounds[1]}], ${infos.typeIndex}`;
        }
    },
    _optional: {
        decode: function (str) {
            return { typeIndex: Number(str) };
        },
        encode: function (infos) {
            return `${infos.typeIndex}`;
        }
    },
    _fourcc: {
        decode: function (str) {
            return {};
        },
        encode: function (infos) {
            return '';
        }
    },
    _bitarray: {
        decode: function (str) {
            return types._int.decode(str);
        },
        encode: function (infos) {
            return types._int.encode(infos);
        }
    },
    _null: {
        decode: function (str) {
            return {};
        },
        encode: function (infos) {
            return '';
        }
    }
};

const tokens = {
    newline: '\n',
    indent: '  ',
    typeinfosStart: 'typeinfos = [',
    typeinfosEnd: ']',
    gameeventsStart: 'game_event_types = {',
    gameeventsEnd: '}',
    messageeventsStart: 'message_event_types = {',
    messageeventsEnd: '}',
    trackereventsStart: 'tracker_event_types = {',
    trackereventsEnd: '}',
    gameeventsTypeid: 'game_eventid_typeid =',
    messageeventsTypeid: 'message_eventid_typeid =',
    trackereventsTypeid: 'tracker_eventid_typeid =',
    headerTypeid: 'replay_header_typeid =',
    detailsTypeid: 'game_details_typeid =',
    initdataTypeid: 'replay_initdata_typeid ='
};

const _data = {
    realms: [undefined, 'live'],
    regions: [
        undefined,
        undefined,
        'Europe'
    ],
    heroes: [],
    mounts: [],
    maps: [],
    builds: []
};

export class PythonProtocolConverter {
    private pyCode: string;

    private typeinfos: any[];
    private gameeventsTypes: any[];
    private messageeventsTypes: any[];
    private trackereventstypes: any[];

    private gameeventsTypeid;
    private messageeventsTypeid;
    private trackereventsTypeid;
    private headerTypeid;
    private detailsTypeid;
    private initdataTypeid;

    public static compile(protocolCode: string): IHeroProtocol {
        const start = new Date().getTime();
        const protocol: IHeroProtocol = <IHeroProtocol>{};
        const fn = Function('exports', 'decoders', protocolCode);
        fn(protocol, decoders);
        console.log('Protocol Compile Time: ', new Date().getTime() - start);
        return protocol;
    }

    public constructor(private version: number, pyCode: string) {
        this.pyCode = pyCode;
    }

    public convert(): IHeroProtocol {
        return PythonProtocolConverter.compile(this.getCode());
    }

    public getCode(): string {
        this.parse(this.pyCode);
        return this.write();
    }



    private parse(raw: string) {
        const start = new Date().getTime();
        const lines = raw.split(tokens.newline);
        let line = 0, str;
        this.typeinfos = [];
        this.gameeventsTypes = [];
        this.messageeventsTypes = [];
        this.trackereventstypes = [];
        while (line < lines.length) {
            str = lines[line].trim();
            if (str === tokens.typeinfosStart) {
                line += 1;
                str = lines[line].trim();
                do {
                    this.typeinfos.push(this.parseTypeinfos(str));
                    line += 1;
                    str = lines[line].trim();
                } while (str !== tokens.typeinfosEnd);
            } else if (tokens.gameeventsStart === str) {
                line += 1;
                str = lines[line].trim();
                do {
                    this.gameeventsTypes.push(this.parseEvent(str));
                    line += 1;
                    str = lines[line].trim();
                } while (tokens.gameeventsEnd !== str);
            } else if (tokens.messageeventsStart === str) {
                line += 1;
                str = lines[line].trim();
                do {
                    this.messageeventsTypes.push(this.parseEvent(str));
                    line += 1;
                    str = lines[line].trim();
                } while (tokens.messageeventsEnd !== str);
            } else if (tokens.trackereventsStart === str) {
                line += 1;
                str = lines[line].trim();
                do {
                    this.trackereventstypes.push(this.parseEvent(str));
                    line += 1;
                    str = lines[line].trim();
                } while (tokens.trackereventsEnd !== str);
            } else if (str.startsWith(tokens.gameeventsTypeid)) {
                this.gameeventsTypeid = str.match(/\d+/)[0];
            } else if (str.startsWith(tokens.messageeventsTypeid)) {
                this.messageeventsTypeid = str.match(/\d+/)[0];
            } else if (str.startsWith(tokens.trackereventsTypeid)) {
                this.trackereventsTypeid = str.match(/\d+/)[0];
            } else if (str.startsWith(tokens.headerTypeid)) {
                this.headerTypeid = str.match(/\d+/)[0];
            } else if (str.startsWith(tokens.detailsTypeid)) {
                this.detailsTypeid = str.match(/\d+/)[0];
            } else if (str.startsWith(tokens.initdataTypeid)) {
                this.initdataTypeid = str.match(/\d+/)[0];
            }

            line += 1;
        }
        console.log('Protocol Parse Time: ', new Date().getTime() - start);
    }

    private parseEvent(str: string): { key: string, typeIndex: string, name: string } {
        const res = str.match(/^(\d+):\s\((\d+),\s\'(.*)\'/);
        return {
            key: res[1],
            typeIndex: res[2],
            name: res[3]
        };
    }

    private parseTypeinfos(str: string): { str: string, type?: string, index?: string } {
        const typeRegex = /^\('(.*?)',\[(.*)\]\),\s*#(\d+)$/;
        const infos: { str: string, type?: string, index?: string } = { str: str };
        const res = typeRegex.exec(str);
        infos.type = res[1];
        Object.assign(infos, types[infos.type].decode(res[2]));
        infos.index = res[3];
        return infos;
    }

    private write(): string {
        const start = new Date().getTime();
        const buildInfos = _data.builds[this.version];

        let out: string = _template;
        // unnessiary
        out = out.replace('${date}', new Date().toUTCString());
        // unnessiary
        out = out.replace(<any>'${version}', <any>this.version);

        if (buildInfos) {
            const patch = buildInfos.live ? buildInfos.live.patch : buildInfos.ptr.patch;
            out = out.replace('${patch}', `exports.patch = \'${patch}\';${tokens.newline}`);
        } else {
            out = out.replace('${patch}', '');
        }

        out = out.replace('${typeinfos}', this.typeinfos.map((infos, index, ar) => {
            let str = tokens.indent;

            str += `['${infos.type}', [`;
            str += types[infos.type].encode(infos);
            str += `]]${index === (ar.length - 1) ? '' : ','}`;
            str += `  //${infos.index}`;

            return str;
        }).join(tokens.newline));

        out = out.replace('${gameeventsTypes}', this.gameeventsTypes.map((event, index, ar) => {
            let str = tokens.indent;

            str += `${event.key}: [${event.typeIndex}, \'${event.name}\']`;
            str += index === ar.length - 1 ? '' : ',';

            return str;
        }).join(tokens.newline));

        out = out.replace('${messageeventsTypes}', this.messageeventsTypes.map((event, index, ar) => {
            let str = tokens.indent;

            str += `${event.key}: [${event.typeIndex}, \'${event.name}\']`;
            str += index === ar.length - 1 ? '' : ',';

            return str;
        }).join(tokens.newline));

        out = out.replace('${trackereventstypes}', this.trackereventstypes.map((event, index, ar) => {
            let str = tokens.indent + tokens.indent;

            str += `${event.key}: [${event.typeIndex}, \'${event.name}\']`;
            str += index === ar.length - 1 ? '' : ',';

            return str;
        }).join(tokens.newline));

        out = out.replace('${gameeventsTypeid}', this.gameeventsTypeid);
        out = out.replace('${messageeventsTypeid}', this.messageeventsTypeid);
        out = out.replace('${trackereventsTypeid}', this.trackereventsTypeid);
        out = out.replace('${headerTypeid}', this.headerTypeid);
        out = out.replace('${detailsTypeid}', this.detailsTypeid);
        out = out.replace('${initdataTypeid}', this.initdataTypeid);
        console.log('Protocol Write Time: ', new Date().getTime() - start);
        return out;
    }

}
