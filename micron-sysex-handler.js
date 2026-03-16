import { S, defaultRhythm } from './micron-state.js';
import { parsePatchDump, parsePatternDump, parseRhythmDump, parseSetupDump } from './micron-sysex.js';
import { defaultPatch } from './micron-patch.js';
import { BANKS } from './micron-data.js';

let render = ()=>{};
export function setHandlerRender(fn) { render=fn; }

let _captureBuffer = [];
let _capturing = false;
let _rxCounters = { program: 0, pattern: 0, setup: 0, rhythm: 0 };

export function resetRxCounters() { _rxCounters = { program: 0, pattern: 0, setup: 0, rhythm: 0 }; }

export function startCapture() { _captureBuffer = []; _capturing = true; S._capturing = true; S.sysexLog = 'Capture started — waiting for SysEx...'; console.log('SysEx capture started'); render(); }
export function stopCapture() {
  _capturing = false;
  if (!_captureBuffer.length) { console.log('No SysEx captured'); return; }
  const allBytes = _captureBuffer.flatMap(msg => Array.from(msg));
  const blob = new Blob([new Uint8Array(allBytes)], {type:'application/octet-stream'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'micron-capture.syx'; a.click();
  URL.revokeObjectURL(url);
  console.log(`Captured ${_captureBuffer.length} SysEx messages, ${allBytes.length} bytes total`);
  S.sysexLog = `Captured ${_captureBuffer.length} messages → micron-capture.syx`;
  render();
}

export function restoreFromStorage() {
  let restored = 0;
  for (let b = 0; b < 4; b++) for (let s = 0; s < 128; s++) {
    if (S.sysexBanks[b][s]) continue;
    try { const item = localStorage.getItem(`micron_patch_${b}_${s}`);
      if (item) { S.sysexBanks[b][s] = JSON.parse(item); restored++; } } catch(_) {}
  }
  for (let s = 0; s < 128; s++) {
    if (!S.sysexPatterns[s]) try { const item = localStorage.getItem(`micron_pattern_${s}`);
      if (item) { S.sysexPatterns[s] = JSON.parse(item); restored++; } } catch(_) {}
    if (!S.sysexSetups[s]) try { const item = localStorage.getItem(`micron_setup_${s}`);
      if (item) { S.sysexSetups[s] = JSON.parse(item); restored++; } } catch(_) {}
    if (!S.sysexRhythms[s]) try { const item = localStorage.getItem(`micron_rhythm_${s}`);
      if (item) { S.sysexRhythms[s] = JSON.parse(item); restored++; } } catch(_) {}
  }
  for (let b = 0; b < 4; b++) for (let s = 0; s < 128; s++) {
    const p = S.sysexBanks[b][s];
    if (p?.raw) {
      try { const re = parsePatchDump(new Uint8Array(p.raw));
        if (re) { p.name = re.name; p.params = re.params; }
      } catch(_) {}
    }
  }
  if (restored) console.log(`Restored ${restored} items from localStorage`);
}

export function handleSysEx(data) {
  if (_capturing) _captureBuffer.push(Array.from(data));
  S._captureCount = _captureBuffer.length;
  const hex = Array.from(data.slice(0,20)).map(b=>b.toString(16).padStart(2,'0')).join(' ');
  S.sysexLog = `Rx #${_captureBuffer.length}: [${data.length}b] ${hex}`;
  console.log(`SysEx #${_captureBuffer.length}: len=${data.length} first20=${hex}`);
  const isAlesis = data[1]===0x00&&data[2]===0x00&&data[3]===0x0E;
  const productId = data[4];
  if (!isAlesis || (productId !== 0x22 && productId !== 0x26)) {
    render(); return;
  }
  const content = data[5];
  S.sysexLog = `Rx: content=${content} [${data.length}b] ${hex.slice(0,80)}`;
  console.log(`SysEx rx: content=${content} bank=${data[6]} slot=${data[8]} len=${data.length} hex=${hex.slice(0,100)}`);
  if (content === 1) handlePatchSysEx(data);
  else if (content === 2) handleContent2SysEx(data);
  else if (content === 3) handlePatternSysEx(data);
  else if (content === 4) handleContent4SysEx(data);
  else S.sysexLog = `Rx unknown content=${content} product=0x${productId.toString(16)} [${data.length}b]`;
  render();
}

function handlePatchSysEx(data) {
  const parsed = parsePatchDump(data);
  if (!parsed) return;
  let { bank, slot, name, params } = parsed;
  if (bank === 4 && S._lastReqBank !== undefined && S._lastReqBank < 4) {
    bank = S._lastReqBank; slot = S._lastReqSlot;
  } else if (bank === 4 && (S._lastReqBank === undefined || S._lastReqBank === 4)) {
    const idx = _rxCounters.program++;
    bank = Math.floor(idx / 128) % 4;
    slot = idx % 128;
  }
  if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
  const raw = Array.from(data);
  if (bank >= 0 && bank < 4 && slot >= 0 && slot < 128) {
    S.sysexBanks[bank][slot] = {name, params, raw};
    try { localStorage.setItem(`micron_patch_${bank}_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
  } else if (bank === 4) {
    if (!S.sysexBanks[4]) S.sysexBanks[4] = Array(4).fill(null);
    if (slot >= 0 && slot < 4) S.sysexBanks[4][slot] = {name, params, raw};
  }
  if (bank === S.sysexSelectedBank) S.sysexBank[slot] = {name, params, raw};
  S.patch = {...defaultPatch(), ...params};
  S.sysexLog = `Rx program: "${name}" bank ${BANKS[bank]||bank} slot ${slot}`;
}

function handlePatternSysEx(data) {
  const raw = Array.from(data);
  const is26 = data[4] === 0x26;
  const slot = is26 ? _rxCounters.pattern++ : data[8] & 0x7F;
  const parsed = parsePatternDump(data);
  const name = parsed?.name || `Pattern ${slot+1}`;
  if (!S.sysexPatterns) S.sysexPatterns = Array(256).fill(null);
  if (slot >= 0 && slot < 256) {
    S.sysexPatterns[slot] = {name, raw};
    try { localStorage.setItem(`micron_pattern_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
  }
  if (parsed && !parsed.rawFormat) {
    const { len, grid, type, steps } = parsed;
    while (S.patterns.length <= slot) S.patterns.push({name:`Pat ${S.patterns.length+1}`,len:16,grid:0.0625,type:'seq',steps:Array.from({length:64},()=>({notes:[],len:0.0625,prob:100}))});
    S.patterns[slot] = { name, len, grid, type, steps };
  }
  S.sysexLog = `Rx pattern #${slot}: "${name}" [${data.length}b]`;
}

function handleContent2SysEx(data) {
  const raw = Array.from(data);
  const is26 = data[4] === 0x26;
  const slot = is26 ? _rxCounters.setup++ : data[8] & 0x7F;
  const setupParsed = parseSetupDump(data);
  const name = setupParsed?.name || `Setup ${slot+1}`;
  if (!S.sysexSetups) S.sysexSetups = Array(256).fill(null);
  if (slot >= 0 && slot < 256) {
    S.sysexSetups[slot] = {name, raw};
    try { localStorage.setItem(`micron_setup_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
  }
  S.sysexLog = `Rx setup #${slot}: "${name}" [${data.length}b]`;
}

function handleContent4SysEx(data) {
  const raw = Array.from(data);
  const is26 = data[4] === 0x26;
  const slot = is26 ? _rxCounters.rhythm++ : data[8] & 0x7F;
  const rhythmParsed = parseRhythmDump(data);
  const name = rhythmParsed?.name || `Rhythm ${slot+1}`;
  if (!S.sysexRhythms) S.sysexRhythms = Array(256).fill(null);
  if (slot >= 0 && slot < 256) {
    S.sysexRhythms[slot] = {name, raw};
    try { localStorage.setItem(`micron_rhythm_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
  }
  if (rhythmParsed) {
    while (S.rhythms.length <= slot) S.rhythms.push(defaultRhythm());
    S.rhythms[slot] = { name, len: rhythmParsed.len, grid: rhythmParsed.grid, drums: rhythmParsed.drums };
  }
  S.sysexLog = `Rx rhythm #${slot}: "${name}" [${data.length}b]`;
}
