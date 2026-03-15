import { sendNRPN } from './micron-midi.js';

export const NRPN_MAP = {
  polyMode:{n:0,min:0,max:1}, unison:{n:1,min:0,max:1}, unisonDetune:{n:2,min:0,max:100},
  portamento:{n:3,min:0,max:1}, portaType:{n:4,min:0,max:3}, portaTime:{n:5,min:0,max:127},
  pitchBendMode:{n:6,min:0,max:1}, analogDrift:{n:7,min:0,max:100},
  oscSync:{n:8,min:0,max:1}, fmAmount:{n:9,min:0,max:1000}, fmType:{n:10,min:0,max:1},
  osc1Wave:{n:11,min:0,max:2}, osc1Shape:{n:12,min:0,max:100},
  osc1Oct:{n:13,min:0,max:6}, osc1Semi:{n:14,min:0,max:14}, osc1Fine:{n:15,min:-999,max:999},
  osc1PBRange:{n:16,min:0,max:12},
  osc2Wave:{n:17,min:0,max:2}, osc2Shape:{n:18,min:0,max:100},
  osc2Oct:{n:19,min:0,max:6}, osc2Semi:{n:20,min:0,max:14}, osc2Fine:{n:21,min:-999,max:999},
  osc2PBRange:{n:22,min:0,max:12},
  osc3Wave:{n:23,min:0,max:2}, osc3Shape:{n:24,min:0,max:100},
  osc3Oct:{n:25,min:0,max:6}, osc3Semi:{n:26,min:0,max:14}, osc3Fine:{n:27,min:-999,max:999},
  osc3PBRange:{n:28,min:0,max:12},
  osc1Level:{n:29,min:0,max:100}, osc2Level:{n:30,min:0,max:100}, osc3Level:{n:31,min:0,max:100},
  ringLevel:{n:32,min:0,max:100}, noiseLevel:{n:33,min:0,max:100}, extInLevel:{n:34,min:0,max:100},
  osc1Bal:{n:35,min:-50,max:50}, osc2Bal:{n:36,min:-50,max:50}, osc3Bal:{n:37,min:-50,max:50},
  ringBal:{n:38,min:-50,max:50}, noiseBal:{n:39,min:-50,max:50}, extInBal:{n:40,min:-50,max:50},
  f1ToF2:{n:41,min:0,max:100}, noiseType:{n:42,min:0,max:1},
  f1Type:{n:43,min:0,max:20}, f1Cutoff:{n:44,min:0,max:1023}, f1Res:{n:45,min:0,max:100},
  f1Keytrk:{n:46,min:-100,max:200}, f1EnvAmt:{n:47,min:-100,max:100},
  f2OffsetType:{n:48,min:0,max:1}, f2Type:{n:49,min:0,max:20},
  f2Cutoff:{n:50,min:0,max:1023}, f2Res:{n:51,min:0,max:100},
  f2Keytrk:{n:52,min:-100,max:200}, f2EnvAmt:{n:53,min:-100,max:100},
  f1Level:{n:54,min:0,max:100}, f2Level:{n:55,min:0,max:100}, unfiltLevel:{n:56,min:0,max:100},
  f1Pan:{n:57,min:-100,max:100}, f2Pan:{n:58,min:-100,max:100}, unfiltPan:{n:59,min:-100,max:100},
  unfiltSrc:{n:60,min:0,max:6}, f1Polarity:{n:61,min:0,max:1},
  driveType:{n:62,min:0,max:6}, driveLevel:{n:63,min:0,max:100},
  outputLevel:{n:64,min:0,max:100}, fx1Mix:{n:65,min:0,max:100},
  e1AtkTime:{n:66,min:0,max:255}, e1AtkSlope:{n:67,min:0,max:2},
  e1DecTime:{n:68,min:0,max:255}, e1DecSlope:{n:69,min:0,max:2},
  e1SusTime:{n:70,min:0,max:255}, e1SusLevel:{n:71,min:0,max:100},
  e1RelTime:{n:72,min:0,max:256}, e1RelSlope:{n:73,min:0,max:2},
  e1Vel:{n:74,min:0,max:100}, e1Reset:{n:75,min:0,max:4}, e1Freerun:{n:76,min:0,max:1},
  e1Loop:{n:77,min:0,max:3}, e1Pedal:{n:78,min:0,max:1},
  e2AtkTime:{n:79,min:0,max:255}, e2AtkSlope:{n:80,min:0,max:2},
  e2DecTime:{n:81,min:0,max:255}, e2DecSlope:{n:82,min:0,max:2},
  e2SusTime:{n:83,min:0,max:255}, e2SusLevel:{n:84,min:-100,max:100},
  e2RelTime:{n:85,min:0,max:256}, e2RelSlope:{n:86,min:0,max:2},
  e2Vel:{n:87,min:0,max:100}, e2Reset:{n:88,min:0,max:4}, e2Freerun:{n:89,min:0,max:1},
  e2Loop:{n:90,min:0,max:3}, e2Pedal:{n:91,min:0,max:1},
  e3AtkTime:{n:92,min:0,max:255}, e3AtkSlope:{n:93,min:0,max:2},
  e3DecTime:{n:94,min:0,max:255}, e3DecSlope:{n:95,min:0,max:2},
  e3SusTime:{n:96,min:0,max:255}, e3SusLevel:{n:97,min:-100,max:100},
  e3RelTime:{n:98,min:0,max:256}, e3RelSlope:{n:99,min:0,max:2},
  e3Vel:{n:100,min:0,max:100}, e3Reset:{n:101,min:0,max:4}, e3Freerun:{n:102,min:0,max:1},
  e3Loop:{n:103,min:0,max:3}, e3Pedal:{n:104,min:0,max:1},
  lfo1Sync:{n:105,min:0,max:1}, lfo1Rate:{n:106,min:0,max:1023}, lfo1Reset:{n:107,min:0,max:4},
  lfo1M1:{n:108,min:0,max:100},
  lfo2Sync:{n:109,min:0,max:1}, lfo2Rate:{n:110,min:0,max:1023}, lfo2Reset:{n:111,min:0,max:4},
  lfo2M1:{n:112,min:0,max:100},
  shSync:{n:113,min:0,max:1}, shRate:{n:114,min:0,max:1023}, shReset:{n:115,min:0,max:4},
  shInput:{n:116,min:0,max:114}, shSmooth:{n:117,min:0,max:100},
  trkInput:{n:118,min:0,max:79}, trkPreset:{n:119,min:0,max:9},
  trkPoints:{n:120,min:0,max:1},
  category:{n:160,min:0,max:10}, knobX:{n:161,min:0,max:161}, knobY:{n:162,min:0,max:161},
  knobZ:{n:163,min:0,max:161}, f2OffsetFreq:{n:164,min:-400,max:400},
  lfo1SyncRate:{n:165,min:0,max:24}, lfo2SyncRate:{n:166,min:0,max:24},
  shSyncRate:{n:167,min:0,max:24},
  arpPattern:{n:200,min:0,max:31}, arpMult:{n:201,min:0,max:6}, arpLength:{n:202,min:0,max:14},
  arpOctRange:{n:203,min:0,max:4}, arpSpan:{n:204,min:0,max:2}, arpOrder:{n:205,min:0,max:5},
  arpMode:{n:206,min:0,max:2}, arpTempo:{n:207,min:500,max:2500},
};

for (let i=0;i<12;i++) {
  NRPN_MAP[`mod${i+1}Src`] = {n:121+i*3, min:0, max:115};
  NRPN_MAP[`mod${i+1}Dst`] = {n:122+i*3, min:0, max:78};
  NRPN_MAP[`mod${i+1}Lvl`] = {n:123+i*3, min:-1000, max:1000};
}
for (let i=0;i<12;i++) NRPN_MAP[`mod${i+1}Off`] = {n:157+i, min:-1000, max:1000};
for (let i=0;i<33;i++) NRPN_MAP[`trkY${i}`] = {n:169+i, min:-100, max:100};
for (let i=0;i<8;i++) NRPN_MAP[`fx1P${String.fromCharCode(65+i)}`] = {n:220+i, min:-100, max:127};
for (let i=0;i<6;i++) NRPN_MAP[`fx2P${String.fromCharCode(65+i)}`] = {n:228+i, min:-128, max:127};

export const P = {};
export function sendParam(key, val) {
  P[key] = val;
  const def = NRPN_MAP[key];
  if (def) sendNRPN(def.n, val);
}
export function clamp(key, val) {
  const d = NRPN_MAP[key];
  if (!d) return val;
  return Math.max(d.min, Math.min(d.max, Math.round(val)));
}
export function defaultPatch() {
  return {polyMode:1,unison:1,unisonVoices:0,unisonDetune:30,portamento:1,portaType:0,portaTime:30,pitchBendMode:0,portaMode:0,analogDrift:20,category:0,osc1Wave:0,osc1Shape:0,osc1Oct:3,osc1Semi:7,osc1Fine:0,osc1PBRange:2,osc2Wave:0,osc2Shape:0,osc2Oct:3,osc2Semi:7,osc2Fine:0,osc2PBRange:2,osc3Wave:0,osc3Shape:0,osc3Oct:3,osc3Semi:7,osc3Fine:0,osc3PBRange:2,fmAmount:0,fmType:0,osc1Level:100,osc2Level:0,osc3Level:0,ringLevel:0,noiseLevel:0,extInLevel:0,osc1Bal:0,osc2Bal:0,osc3Bal:0,ringBal:0,noiseBal:0,extInBal:0,f1ToF2:0,noiseType:0,f1Type:1,f1Cutoff:512,f1Res:0,f1Keytrk:100,f1EnvAmt:50,f2OffsetType:0,f2Type:0,f2Cutoff:512,f2Res:0,f2Keytrk:100,f2EnvAmt:0,f1Level:100,f2Level:0,unfiltLevel:0,f1Pan:0,f2Pan:0,unfiltPan:0,unfiltSrc:0,f1Polarity:0,driveType:0,driveLevel:0,outputLevel:80,fx1Mix:0,e1AtkTime:10,e1AtkSlope:0,e1DecTime:80,e1DecSlope:0,e1SusTime:0,e1SusLevel:70,e1RelTime:80,e1RelSlope:0,e1Vel:100,e1Reset:1,e1Freerun:0,e1Loop:3,e1Pedal:0,e2AtkTime:10,e2AtkSlope:0,e2DecTime:80,e2DecSlope:0,e2SusTime:0,e2SusLevel:0,e2RelTime:80,e2RelSlope:0,e2Vel:80,e2Reset:1,e2Freerun:0,e2Loop:3,e2Pedal:0,e3AtkTime:10,e3AtkSlope:0,e3DecTime:80,e3DecSlope:0,e3SusTime:0,e3SusLevel:0,e3RelTime:80,e3RelSlope:0,e3Vel:0,e3Reset:1,e3Freerun:0,e3Loop:3,e3Pedal:0,lfo1Sync:1,lfo1Rate:200,lfo1Reset:1,lfo1M1:0,lfo2Sync:1,lfo2Rate:200,lfo2Reset:1,lfo2M1:0,shSync:1,shRate:200,shReset:1,shInput:0,shSmooth:0,trkInput:0,trkPreset:1,trkPoints:0,fx1Type:0,fx1Mix:50,arpPattern:0,arpMult:3,arpLength:8,arpOctRange:0,arpSpan:0,arpOrder:0,arpMode:1,arpTempo:1200};
}
export function sendAllParams(patch) {
  Object.entries(patch).forEach(([k,v]) => { if (NRPN_MAP[k]) sendNRPN(NRPN_MAP[k].n, v); });
}
export function morphPatches(a, b, t) {
  const out = {...a};
  Object.keys(NRPN_MAP).forEach(k => {
    const va = a[k]??0, vb = b[k]??0;
    out[k] = Math.round(va + (vb - va) * t);
  });
  return out;
}
export function randomizePatch(base, locked={}) {
  const out = {...base};
  Object.keys(NRPN_MAP).forEach(k => {
    if (locked[k]) return;
    const {min,max} = NRPN_MAP[k];
    out[k] = Math.round(min + Math.random()*(max-min));
  });
  return out;
}
