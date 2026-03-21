export const M = {
  access: null, output: null, input: null,
  outputs: [], inputs: [], channel: 1,
  rxFlash: false, monitor: [], ccMap: {}, learnTarget: null,
  thru: false, sendClock: false, localControl: true,
  velocityCurve: 'linear', pbVal: 64, modWheelVal: 0,
  clockRunning: false, clockTick: 0,
};

export async function initMIDI(onStateChange) {
  try {
    M.access = await navigator.requestMIDIAccess({sysex:true});
    refreshDevices();
    M.access.onstatechange = () => { refreshDevices(); onStateChange(); };
    return true;
  } catch(e) { return false; }
}

function refreshDevices() {
  M.outputs = [...M.access.outputs.values()];
  M.inputs = [...M.access.inputs.values()];
  const savedOut = localStorage.getItem('micron_output');
  const savedIn = localStorage.getItem('micron_input');
  if (savedOut) M.output = M.outputs.find(o=>o.name===savedOut) || M.output || M.outputs[0];
  else if (!M.output && M.outputs.length) M.output = M.outputs[0];
  if (savedIn) {
    const inp = M.inputs.find(i=>i.name===savedIn);
    if (inp && inp !== M.input) { inp.onmidimessage = window._midiHandler; M.input = inp; }
  }
}

export function setInput(id, handler) {
  M.access?.inputs.forEach(inp => { inp.onmidimessage = null; });
  const inp = M.access?.inputs.get(id) || (M.access?.inputs.values().next().value);
  if (inp) { inp.onmidimessage = handler; M.input = inp; }
}

export function midiOut(data, t) {
  if (!M.output) return;
  try { t !== undefined ? M.output.send(data, t) : M.output.send(data); } catch(_) {}
}

export function sendNRPN(nrpn, val) {
  const ch = M.channel - 1;
  const v = val < 0 ? val + 16384 : val;
  midiOut([0xB0|ch, 99, (nrpn>>7)&127]);
  midiOut([0xB0|ch, 98, nrpn&127]);
  midiOut([0xB0|ch, 6, (v>>7)&127]);
  midiOut([0xB0|ch, 38, v&127]);
}

export function sendCC(cc, val) { midiOut([0xB0|(M.channel-1), cc, val&127]); }
export function sendProgramChange(bank, slot) {
  if (!M.output) return;
  const ch = (M.channel - 1) & 0x0F;
  midiOut([0xB0|ch, 0, 0]);
  midiOut([0xB0|ch, 32, bank & 0x7F]);
  midiOut([0xC0|ch, slot & 0x7F]);
}
export function sendNoteOn(p, v, ch) {
  const vel = applyVelCurve(v);
  midiOut([0x90|((ch??M.channel)-1), p, vel]);
}
export function sendNoteOff(p, ch) { midiOut([0x80|((ch??M.channel)-1), p, 0]); }
export function previewNote(p, dur=200) { sendNoteOn(p,100); setTimeout(()=>sendNoteOff(p), dur); }
export function allNotesOff() {
  for(let c=0;c<16;c++) {
    midiOut([0xB0|c, 123, 0]);
    midiOut([0xB0|c, 120, 0]);
  }
}

export function sendPitchBend(val14bit) {
  const ch = M.channel - 1;
  midiOut([0xE0|ch, val14bit&127, (val14bit>>7)&127]);
}

export function applyVelCurve(v) {
  if (v <= 0) return 0;
  if (v >= 127) return 127;
  const n = v / 127;
  const curve = M.velocityCurve;
  // Legacy names
  if (curve === 'soft') return Math.round(Math.pow(n, 1.5) * 127);
  if (curve === 'hard') return Math.round(Math.pow(n, 0.6) * 127);
  // linear-low: scale down (output peaks around 80% at full input)
  if (curve === 'linear-low')  return Math.round(n * 0.8 * 127);
  // linear-med: identity
  if (curve === 'linear-med')  return v;
  // linear-high: scale up (boost lower velocities)
  if (curve === 'linear-high') return Math.round(Math.min(1, n * 1.25) * 127);
  // exp curves: output = n^exponent, >1 exponent = softer (harder to reach high vels)
  if (curve === 'exp-low')  return Math.round(Math.pow(n, 2.0) * 127);
  if (curve === 'exp-med')  return Math.round(Math.pow(n, 1.5) * 127);
  if (curve === 'exp-high') return Math.round(Math.pow(n, 0.75) * 127);
  // log curves: output = log(1 + n*(e-1)) normalised, positive = earlier peak
  if (curve === 'log-low')  { const k=2; return Math.round(Math.log(1+n*k)/Math.log(1+k)*127); }
  if (curve === 'log-med')  { const k=9; return Math.round(Math.log(1+n*k)/Math.log(1+k)*127); }
  if (curve === 'log-high') { const k=49; return Math.round(Math.log(1+n*k)/Math.log(1+k)*127); }
  return v;
}

const MSG_NAMES = {0x80:'Note Off',0x90:'Note On',0xA0:'Poly AT',0xB0:'CC',0xC0:'PrgCh',0xD0:'Ch AT',0xE0:'PitchBd',0xF0:'SysEx'};
const CC_NAMES = {1:'Mod',6:'NRPN MSB',7:'Volume',10:'Pan',11:'Expr',38:'NRPN LSB',64:'Sustain',65:'Porta',98:'NRPN LSB',99:'NRPN MSB',120:'All Snd Off',123:'All Notes Off'};
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function parseMidiMsg(d) {
  const st = d[0]&0xF0, ch = (d[0]&0x0F)+1;
  if (st===0x90&&d[2]>0) return `Note On  ch${ch} ${NOTE_NAMES[d[1]%12]}${Math.floor(d[1]/12)-1} v${d[2]}`;
  if (st===0x80||(st===0x90&&d[2]===0)) return `Note Off ch${ch} ${NOTE_NAMES[d[1]%12]}${Math.floor(d[1]/12)-1}`;
  if (st===0xB0) return `CC ch${ch} ${CC_NAMES[d[1]]||'#'+d[1]}=${d[2]}`;
  if (st===0xE0) return `PB ch${ch} ${((d[2]<<7)|d[1])-8192}`;
  if (st===0xF0) return `SysEx [${d.length}b]`;
  return `${MSG_NAMES[st]||'?'} ch${ch} ${d[1]||''} ${d[2]||''}`;
}

export function logMidi(type, bytes) {
  M.monitor.unshift({type, bytes: Array.from(bytes), t: Date.now(), msg: parseMidiMsg(bytes)});
  if (M.monitor.length > 64) M.monitor.length = 64;
  M.rxFlash = true;
  setTimeout(() => { M.rxFlash = false; }, 150);
}

let clockInterval = null;
export function setClockSend(active, bpm) {
  M.sendClock = active;
  if (clockInterval) clearInterval(clockInterval);
  if (active) {
    const msPerTick = 60000 / bpm / 24;
    clockInterval = setInterval(() => midiOut([0xF8]), msPerTick);
  }
}
export function updateClockBpm(bpm) {
  if (M.sendClock) setClockSend(true, bpm);
}

export function startClock() { midiOut([0xFA]); }
export function stopClock() { midiOut([0xFC]); }
export function continueClock() { midiOut([0xFB]); }
