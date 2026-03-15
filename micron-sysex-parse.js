import { unpack7of8 } from './micron-sysex.js';

const CONTENT_SETUP = 2, CONTENT_PATTERN = 3;
function s8(v) { return v > 127 ? v - 256 : v; }
function s16(hi, lo) { const v = (hi<<8)|lo; return v > 32767 ? v - 65536 : v; }
function isAlesisDump(data, cb) { return data[1]===0x00&&data[2]===0x00&&data[3]===0x0E&&data[4]===0x22&&data[5]===cb; }
function decodeStr(bytes) { return bytes.map(b=>b>=32&&b<127?String.fromCharCode(b):'').join('').trim(); }
function unpackDump(data) { return unpack7of8(Array.from(data).slice(9, data.length-1)); }
function parseGridLen(u) { const len=u[15]||16,div=u[16]||16; return {len,grid:div>0?1/div:0.0625}; }

export function extractParams(p) {
  return {
    name: p.slice(63,78).map(b=>b>=32&&b<127?String.fromCharCode(b):'').join('').trim(),
    polyMode: p[78]&1, unison: (p[78]>>1)&1, unisonVoices: (p[78]>>2)&3,
    portaType: (p[78]>>6)&3, unisonDetune: p[79]&127, portamento: (p[79]>>7)&1,
    portaTime: s8(p[80]), pitchBendMode: s8(p[81]), portaMode: s8(p[82]),
    analogDrift: s8(p[83]), category: p[86]&255,
    osc1Fine: s16(p[87],p[88]), osc2Fine: s16(p[89],p[90]), osc3Fine: s16(p[91],p[92]),
    osc1Shape: p[93], osc2Shape: p[94], osc3Shape: p[95],
    osc1Oct: p[96]&7, osc1Semi: (p[96]>>4)&15,
    osc1Wave: p[97]&3, pbToOsc1: (p[97]>>2)&15, osc1Sync: (p[97]>>6)&1, syncedOsc: (p[97]>>7)&1,
    syncType: p[98]&1, fmAlgo: (p[98]>>2)&3, osc2Wave: (p[98]>>4)&3, osc3Wave: (p[98]>>6)&3,
    fmType: (p[100]>>7)&1,
    osc2Oct: p[101]&7, osc2Semi: (p[101]>>4)&15, osc3Oct: p[102]&7, osc3Semi: (p[102]>>4)&15,
    pbToOsc2: p[103]&15, pbToOsc3: (p[103]>>4)&15,
    fmAmount: s16(p[104],p[105]),
    osc1Level: p[108], osc2Level: p[109], osc3Level: p[110], ringLevel: p[111], extInLevel: p[112],
    osc1Bal: s8(p[113]), osc2Bal: s8(p[114]), osc3Bal: s8(p[115]), ringBal: s8(p[116]),
    extInBal: s8(p[117]), noiseBal: s8(p[118]), f1ToF2: p[119], noiseLevel: p[120]&127, noiseType: (p[121]>>7)&1,
    f1Cutoff: s16(p[126],p[127]), f2Cutoff: s16(p[128],p[129]),
    f1Res: p[130], f2Res: p[131], f1EnvAmt: s8(p[132]), f2EnvAmt: s8(p[133]),
    f1Keytrk: s16(p[134],p[135]), f2Keytrk: s16(p[136],p[137]),
    f2OffsetType: p[138], f1Type: p[139], f2Type: p[140], f2OffsetFreq: s16(p[141],p[142]),
    f1Level: p[146], f2Level: p[147], unfiltLevel: p[148], unfiltSrc: p[149],
    f1Polarity: p[150], f1Pan: s8(p[151]), f2Pan: s8(p[152]), unfiltPan: s8(p[153]),
    e1Atk: p[168], e2Atk: p[169], e3Atk: p[170],
    e1Dec: p[171], e2Dec: p[172], e3Dec: p[173],
    e1Sus: s8(p[174]), e2Sus: s8(p[175]), e3Sus: s8(p[176]),
    e1Rel: s16(p[183],p[184]), e2Rel: s16(p[185],p[186]), e3Rel: s16(p[187],p[188]),
    e1Vel: p[189], e2Vel: p[190], e3Vel: p[191],
    e1Flags: p[192], e2Flags: p[193], e3Flags: p[194],
    e1Slopes: p[195], e2Slopes: p[196], e3Slopes: p[197],
    lfo1Rate: s16(p[203],p[204]), lfo2Rate: s16(p[205],p[206]),
    m1ToLfo1: p[207], m1ToLfo2: p[208], shInput: p[209], shRate: s16(p[210],p[211]),
    shReset: p[212], lfoFlags1: p[213], lfoFlags2: p[214],
    lfo1SyncRate: p[215], lfo2SyncRate: p[216], shSyncRate: p[217], lfoResets: p[218],
    arpFlags: p[220], arpFlags2: p[221], arpFlags3: p[222], arpTempo: s16(p[223],p[224]),
    modSrcs: Array.from({length:12},(_,i)=>p[230+i]),
    modDsts: Array.from({length:12},(_,i)=>p[242+i]),
    modLevels: Array.from({length:12},(_,i)=>s16(p[254+i*2],p[255+i*2])),
    modOffsets: Array.from({length:12},(_,i)=>s16(p[278+i*2],p[279+i*2])),
    trkInput: p[302], trkPoints: p[303],
    trkY: Array.from({length:33},(_,i)=>s8(p[304+i])), trkPreset: p[337],
    fx1Type: p[342], fx1Mix: p[343], fx1Params: Array.from({length:8},(_,i)=>p[344+i]),
    fx2Balance: p[352], fx2Type: p[353], fx2ParamsE: p[354], fx2ParamsF: p[355],
    fx2ParamA: s16(p[154],p[155]), fx2ParamB: s16(p[156],p[157]),
    fx2ParamC: s16(p[198],p[199]), fx2ParamD: s16(p[200],p[201]),
    driveLevel: p[159], driveType: p[160], outputLevel: p[161],
    knobX: p[162], knobY: p[163], knobZ: p[164],
  };
}

export function parsePatchDump(data) {
  if (data[1]!==0x00||data[2]!==0x00||data[3]!==0x0E||data[4]!==0x22) return null;
  const bank=data[6]&0x0F, slot=data[8]&0x7F;
  const unpacked=unpack7of8(Array.from(data).slice(9,data.length-1));
  if (unpacked.length < 356) return null;
  const name=unpacked.slice(63,78).map(b=>b>=32&&b<127?String.fromCharCode(b):'').join('').trim()||'Untitled';
  return {name, bank, slot, params: extractParams(unpacked), raw: unpacked};
}

export function parsePatternDump(data) {
  if (!isAlesisDump(data, CONTENT_PATTERN)) return null;
  const slot=data[8]&0x7F, bank=data[6]&0x0F;
  const unpacked=unpackDump(data);
  if (unpacked.length < 18) return null;
  const name=decodeStr(unpacked.slice(0,14))||`Pat ${slot+1}`;
  const {len,grid}=parseGridLen(unpacked);
  const type=unpacked[17]?'arp':'seq';
  const steps=[];
  let off=18;
  for (let i=0;i<len&&off+2<unpacked.length;i++,off+=3) {
    const pitch=unpacked[off],vel=unpacked[off+1],lv=unpacked[off+2];
    steps.push(pitch&&pitch!==0xFF?{notes:[{pitch:pitch&0x7F,vel:vel&0x7F,len:lv/16}],len:grid,prob:100}:{notes:[],len:grid,prob:100});
  }
  while (steps.length<64) steps.push({notes:[],len:grid,prob:100});
  return {name,bank,slot,len,grid,type,steps};
}

export function parseRhythmDump(data) {
  if (!isAlesisDump(data, CONTENT_SETUP)) return null;
  const slot=data[8]&0x7F, bank=data[6]&0x0F;
  const unpacked=unpackDump(data);
  if (unpacked.length < 19) return null;
  const name=decodeStr(unpacked.slice(0,14))||`Rhythm ${slot+1}`;
  const {len,grid}=parseGridLen(unpacked);
  const numDrums=unpacked[18]||0;
  const drums=[];
  let off=19;
  for (let d=0;d<numDrums&&off+16<unpacked.length;d++) {
    const program=decodeStr(unpacked.slice(off,off+14))||'Drum';
    off+=15;
    const level=unpacked[off++]&0x7F, pan=(unpacked[off++]&0x7F)-50;
    const steps=[];
    for (let s=0;s<64&&off<unpacked.length;s++,off++) steps.push({active:unpacked[off]>0,vel:unpacked[off]||100});
    while (steps.length<64) steps.push({active:false,vel:100});
    drums.push({program,level,pan,steps});
  }
  if (!drums.length) return null;
  return {name,bank,slot,len,grid,drums};
}

export function parseSetupDump(data) {
  if (!isAlesisDump(data, CONTENT_SETUP)) return null;
  const unpacked=unpackDump(data);
  if (unpacked.length<10) return null;
  return {contrast:unpacked[0]&0x0F,tuning:unpacked[1],transpose:unpacked[2],midiChannel:(unpacked[3]&0x0F)+1,localControl:(unpacked[4]&1)?'on':'off'};
}
