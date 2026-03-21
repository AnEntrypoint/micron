import { unpack7of8 } from './micron-sysex.js';

const CONTENT_SETUP = 2, CONTENT_PATTERN = 3, CONTENT_RHYTHM = 4;
function s8(v) { return v > 127 ? v - 256 : v; }
function s16(hi, lo) { const v = (hi<<8)|lo; return v > 32767 ? v - 65536 : v; }
function isAlesisDump(data, cb) { return data[1]===0x00&&data[2]===0x00&&data[3]===0x0E&&(data[4]===0x22||data[4]===0x26)&&data[5]===cb; }
function decodeStr(bytes) { return bytes.map(b=>b>=32&&b<127?String.fromCharCode(b):'').join('').trim(); }
function unpackDump(data) { return unpack7of8(Array.from(data).slice(9, data.length-1)); }
function contentBase(unpacked) {
  if (unpacked[0]===0x51&&unpacked[1]===0x30&&unpacked[2]===0x31) return 56;
  return 0;
}
function parseGridLen(u, base) { const b=base||0; const len=u[b+15]||16,div=u[b+16]||16; return {len,grid:div>0?1/div:0.0625}; }
const STEPS_PER_BAR = 16;
function parseMicronPattern(u, base, name, bank, slot) {
  const noteCount = u[base + 27] & 0x7F;
  const ccCount = u[base + 31];
  const evtStart = base + 35;
  const events = [];
  for (let i = 0; i < noteCount && evtStart + i * 8 + 7 < u.length; i++) {
    const off = evtStart + i * 8;
    const dur = u[off] & 0x7F;
    const b1 = u[off + 1];
    const b2raw = u[off + 2];
    const vel = u[off + 4] & 0x7F;
    const b5 = u[off + 5];
    const noteLenTicks = u[off + 6];
    const b7 = u[off + 7];
    // b7 >= 0x20 marks loop-end/structural markers, not real notes — skip them
    if (b7 >= 0x20) continue;
    const step = (b5 >> 7) * STEPS_PER_BAR + (b5 & 0x7F);
    // b1=127/255 events store pitch as "128 - semitones_below_C4"; b1=0 events store relative semitones above C4
    const pitch = (b1 === 0x7F || b1 === 0xFF) ? 60 - (128 - (b2raw & 0x7F)) : 60 + (b2raw & 0x7F);
    if (step < 256) events.push({ pitch, vel, dur, noteLenTicks, step });
  }
  const maxStep = events.reduce((m, e) => Math.max(m, e.step), 0);
  const bars = Math.max(1, Math.ceil((maxStep + 1) / STEPS_PER_BAR));
  const len = bars * STEPS_PER_BAR;
  const grid = 1 / STEPS_PER_BAR;
  const steps = Array.from({length: Math.max(len, 16)}, () => ({notes: [], len: grid, prob: 100}));
  events.forEach(e => {
    if (e.step >= 0 && e.step < steps.length) {
      const noteLen = e.noteLenTicks > 64 ? grid * 2 : grid;
      steps[e.step].notes.push({pitch: Math.max(0, Math.min(127, e.pitch)), vel: e.vel || 100, len: noteLen});
    }
  });
  return {name, bank, slot, len, grid, type: 'seq', steps, micronFormat: true, noteCount, ccCount};
}

export function extractParams(p) {
  return {
    patchName: p.slice(56,71).map(b=>b>=32&&b<127?String.fromCharCode(b):'').join('').trim(),
    polyMode: p[71]&1, unison: (p[71]>>1)&1, unisonVoices: (p[71]>>2)&3,
    portaType: (p[71]>>6)&3, unisonDetune: p[72]&127, portamento: (p[72]>>7)&1,
    portaTime: p[73]&127, pitchBendMode: p[74]&1, portaMode: p[75]&1,
    analogDrift: p[76]&127, category: p[79]&255,
    osc1Fine: s16(p[80],p[81]), osc2Fine: s16(p[82],p[83]), osc3Fine: s16(p[84],p[85]),
    osc1Shape: Math.min(100, p[86]), osc2Shape: Math.min(100, p[87]), osc3Shape: Math.min(100, p[88]),
    osc1Oct: p[89]&7, osc1Semi: (p[89]>>4)&15,
    osc1Wave: p[90]&3, pbToOsc1: (p[90]>>2)&15, osc1Sync: (p[90]>>6)&1, syncedOsc: (p[90]>>7)&1,
    syncType: p[91]&1, fmAlgo: (p[91]>>2)&3, osc2Wave: (p[91]>>4)&3, osc3Wave: (p[91]>>6)&3,
    fmType: (p[93]>>7)&1,
    osc2Oct: p[94]&7, osc2Semi: (p[94]>>4)&15, osc3Oct: p[95]&7, osc3Semi: (p[95]>>4)&15,
    pbToOsc2: p[96]&15, pbToOsc3: (p[96]>>4)&15,
    fmAmount: s16(p[97],p[98]),
    osc1Level: p[101], osc2Level: p[102], osc3Level: p[103], ringLevel: p[104], extInLevel: p[105],
    osc1Bal: s8(p[106]), osc2Bal: s8(p[107]), osc3Bal: s8(p[108]), ringBal: s8(p[109]),
    extInBal: s8(p[110]), noiseBal: s8(p[111]), f1ToF2: p[112], noiseLevel: p[113]&127, noiseType: (p[114]>>7)&1,
    f1Cutoff: s16(p[119],p[120]), f2Cutoff: s16(p[121],p[122]),
    f1Res: p[123], f2Res: p[124], f1EnvAmt: s8(p[125]), f2EnvAmt: s8(p[126]),
    f1Keytrk: s16(p[127],p[128]), f2Keytrk: s16(p[129],p[130]),
    f2OffsetType: p[131], f1Type: p[132], f2Type: p[133], f2OffsetFreq: s16(p[134],p[135]),
    f1Level: p[139], f2Level: p[140], unfiltLevel: p[141], unfiltSrc: p[142],
    f1Polarity: p[143], f1Pan: s8(p[144]), f2Pan: s8(p[145]), unfiltPan: s8(p[146]),
    e1AtkTime: p[161], e2AtkTime: p[162], e3AtkTime: p[163],
    e1DecTime: p[164], e2DecTime: p[165], e3DecTime: p[166],
    e1SusLevel: s8(p[167]), e2SusLevel: s8(p[168]), e3SusLevel: s8(p[169]),
    e1RelTime: s16(p[176],p[177]), e2RelTime: s16(p[178],p[179]), e3RelTime: s16(p[180],p[181]),
    e1Vel: p[182], e2Vel: p[183], e3Vel: p[184],
    e1Loop: p[185]&3, e1Pedal: (p[185]>>3)&1, e1Reset: (p[185]>>4)&7, e1Freerun: (p[185]>>7)&1,
    e2Loop: p[186]&3, e2Pedal: (p[186]>>3)&1, e2Reset: (p[186]>>4)&7, e2Freerun: (p[186]>>7)&1,
    e3Loop: p[187]&3, e3Pedal: (p[187]>>3)&1, e3Reset: (p[187]>>4)&7, e3Freerun: (p[187]>>7)&1,
    e1AtkSlope: p[188]&3, e1DecSlope: (p[188]>>4)&3, e1RelSlope: (p[188]>>6)&3,
    e2AtkSlope: p[189]&3, e2DecSlope: (p[189]>>4)&3, e2RelSlope: (p[189]>>6)&3,
    e3AtkSlope: p[190]&3, e3DecSlope: (p[190]>>4)&3, e3RelSlope: (p[190]>>6)&3,
    lfo1Rate: s16(p[196],p[197]), lfo2Rate: s16(p[198],p[199]),
    lfo1M1: p[200], lfo2M1: p[201], shInput: p[202], shRate: s16(p[203],p[204]),
    shReset: p[205],
    lfo1Sync: p[206]&1, shSmooth: (p[206]>>1)&127,
    lfo2Sync: (p[207]>>2)&1, shSync: (p[207]>>4)&1,
    lfo1SyncRate: p[208], lfo2SyncRate: p[209], shSyncRate: p[210],
    lfo1Reset: p[211]&7, lfo2Reset: (p[211]>>4)&7,
    arpPattern: p[213]&31, arpMult: (p[213]>>5)&7,
    arpLength: p[214]&15, arpOctRange: (p[214]>>4)&7,
    arpSpan: p[215]&3, arpOrder: (p[215]>>3)&7, arpMode: (p[215]>>6)&3,
    arpTempo: s16(p[216],p[217]),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Src`,p[223+i]])),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Dst`,p[235+i]])),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Lvl`,s16(p[247+i*2],p[248+i*2])])),
    ...Object.fromEntries(Array.from({length:12},(_,i)=>[`mod${i+1}Off`,s16(p[271+i*2],p[272+i*2])])),
    trkInput: p[295], trkPoints: p[296],
    ...Object.fromEntries(Array.from({length:33},(_,i)=>[`trkY${i}`,s8(p[297+i])])), trkPreset: p[330],
    fx1Type: p[335], fx1Mix: Math.min(100, p[336]),
    ...Object.fromEntries(Array.from({length:8},(_,i)=>[`fx1P${String.fromCharCode(65+i)}`,s8(p[337+i])])),
    fx2Balance: p[345], fx2Type: p[346],
    fx2PE: p[347], fx2PF: p[348],
    fx2PA: s16(p[147],p[148]), fx2PB: s16(p[149],p[150]),
    fx2PC: s16(p[191],p[192]), fx2PD: s16(p[193],p[194]),
    driveLevel: p[152], driveType: p[153], outputLevel: p[154],
    knobX: p[155], knobY: p[156], knobZ: p[157],
  };
}

export function parsePatchDump(data) {
  if (data[1]!==0x00||data[2]!==0x00||data[3]!==0x0E||(data[4]!==0x22&&data[4]!==0x26)) return null;
  if (data[5] !== 1) return null;
  const off = 9;
  const bank = data[4] === 0x26 ? data[6] : data[6]&0x0F;
  const slot = data[4] === 0x26 ? data[8] : data[8]&0x7F;
  const unpacked=unpack7of8(Array.from(data).slice(off,data.length-1));
  if (unpacked.length < 349) return null;
  const name=unpacked.slice(56,71).map(b=>b>=32&&b<127?String.fromCharCode(b):'').join('').trim()||'Untitled';
  return {name, bank, slot, params: extractParams(unpacked)};
}

export function parsePatternDump(data) {
  if (!isAlesisDump(data, CONTENT_PATTERN)) return null;
  const slot=data[8]&0x7F, bank=data[6]&0x0F;
  const unpacked=unpackDump(data);
  const base=contentBase(unpacked);
  if (unpacked.length < base+18) return null;
  const name=decodeStr(unpacked.slice(base,base+14))||`Pat ${slot+1}`;
  if (base > 0) return parseMicronPattern(unpacked, base, name, bank, slot);
  const {len,grid}=parseGridLen(unpacked, 0);
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
  if (!isAlesisDump(data, CONTENT_RHYTHM)) return null;
  const slot=data[8]&0x7F, bank=data[6]&0x0F;
  const unpacked=unpackDump(data);
  const base=contentBase(unpacked);
  if (unpacked.length < base+19) return null;
  const name=decodeStr(unpacked.slice(base,base+14))||`Rhythm ${slot+1}`;
  if (base > 0) return {name,bank,slot,rawFormat:true,isRhythm:true};
  const {len,grid}=parseGridLen(unpacked, 0);
  const numDrums=unpacked[18]||0;
  if (numDrums === 0 || numDrums > 16) return null;
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
  return {name,bank,slot,len,grid,drums,isRhythm:true};
}

export function parseSetupDump(data) {
  const unpacked=unpackDump(data);
  if (unpacked.length<14) return null;
  const base=contentBase(unpacked);
  const name=decodeStr(unpacked.slice(base,base+14))||'Setup';
  return {name,isSetup:true};
}
