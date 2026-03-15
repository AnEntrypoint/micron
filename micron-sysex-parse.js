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
    patchName: p.slice(63,78).map(b=>b>=32&&b<127?String.fromCharCode(b):'').join('').trim(),
    polyMode: p[78]&1, unison: (p[78]>>1)&1, unisonVoices: (p[78]>>2)&3,
    portaType: (p[78]>>6)&3, unisonDetune: p[79]&127, portamento: (p[79]>>7)&1,
    portaTime: p[80]&127, pitchBendMode: p[81]&1, portaMode: p[82]&1,
    analogDrift: p[83]&127, category: p[86]&255,
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
    e1AtkTime: p[168], e2AtkTime: p[169], e3AtkTime: p[170],
    e1DecTime: p[171], e2DecTime: p[172], e3DecTime: p[173],
    e1SusLevel: s8(p[174]), e2SusLevel: s8(p[175]), e3SusLevel: s8(p[176]),
    e1RelTime: s16(p[183],p[184]), e2RelTime: s16(p[185],p[186]), e3RelTime: s16(p[187],p[188]),
    e1Vel: p[189], e2Vel: p[190], e3Vel: p[191],
    e1AtkSlope: p[195]&3, e1DecSlope: (p[195]>>2)&3, e1RelSlope: (p[195]>>4)&3,
    e2AtkSlope: p[196]&3, e2DecSlope: (p[196]>>2)&3, e2RelSlope: (p[196]>>4)&3,
    e3AtkSlope: p[197]&3, e3DecSlope: (p[197]>>2)&3, e3RelSlope: (p[197]>>4)&3,
    e1Reset: p[192]&7, e1Loop: (p[192]>>3)&3, e1Freerun: (p[192]>>5)&1, e1Pedal: (p[192]>>6)&1,
    e2Reset: p[193]&7, e2Loop: (p[193]>>3)&3, e2Freerun: (p[193]>>5)&1, e2Pedal: (p[193]>>6)&1,
    e3Reset: p[194]&7, e3Loop: (p[194]>>3)&3, e3Freerun: (p[194]>>5)&1, e3Pedal: (p[194]>>6)&1,
    lfo1Rate: s16(p[203],p[204]), lfo2Rate: s16(p[205],p[206]),
    lfo1M1: p[207], lfo2M1: p[208], shInput: p[209], shRate: s16(p[210],p[211]),
    shReset: p[212],
    lfo1Sync: p[213]&1, lfo2Sync: (p[213]>>1)&1, shSync: (p[213]>>2)&1,
    lfo1Reset: p[214]&7, lfo2Reset: (p[214]>>3)&7,
    lfo1SyncRate: p[215], lfo2SyncRate: p[216], shSyncRate: p[217],
    arpMode: p[220]&3, arpOrder: (p[220]>>2)&7, arpSpan: (p[220]>>5)&3,
    arpMult: p[221]&7, arpLength: (p[221]>>3)&15, arpOctRange: (p[221]>>7)&7,
    arpPattern: p[222]&31, arpTempo: s16(p[223],p[224]),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Src`,p[230+i]])),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Dst`,p[242+i]])),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Lvl`,s16(p[254+i*2],p[255+i*2])])),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Off`,s16(p[278+i*2],p[279+i*2])])),
    trkInput: p[302], trkPoints: p[303],
    ...Object.fromEntries(Array.from({length:33},(_,i)=>[`trkY${i}`,s8(p[304+i])])), trkPreset: p[337],
    fx1Type: p[342], fx1Mix: p[343],
    ...Object.fromEntries(Array.from({length:8},(_,i)=>[`fx1P${String.fromCharCode(65+i)}`,p[344+i]])),
    fx2Balance: p[352], fx2Type: p[353],
    fx2PE: p[354], fx2PF: p[355],
    fx2PA: s16(p[154],p[155]), fx2PB: s16(p[156],p[157]),
    fx2PC: s16(p[198],p[199]), fx2PD: s16(p[200],p[201]),
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
  return {name, bank, slot, params: extractParams(unpacked)};
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
