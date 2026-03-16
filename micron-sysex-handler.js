import { S, defaultRhythm } from './micron-state.js';
import { parsePatchDump, parsePatternDump, parseRhythmDump, parseSetupDump } from './micron-sysex.js';
import { defaultPatch } from './micron-patch.js';
import { BANKS } from './micron-data.js';

let render = ()=>{};
export function setHandlerRender(fn) { render=fn; }

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
  const hex = Array.from(data).map(b=>b.toString(16).padStart(2,'0')).join(' ');
  S.sysexLog = `Rx: [${data.length}b] ${hex.slice(0,120)}`;
  if (!(data[1]===0x00&&data[2]===0x00&&data[3]===0x0E&&data[4]===0x22)) { render(); return; }
  const content = data[5];
  if (content === 1) handlePatchSysEx(data);
  else if (content === 3) handlePatternSysEx(data);
  else if (content === 2) handleContent2SysEx(data);
  render();
}

function handlePatchSysEx(data) {
  const parsed = parsePatchDump(data);
  if (!parsed) return;
  let { bank, slot, name, params } = parsed;
  if (bank === 4 && S._lastReqBank !== undefined) { bank = S._lastReqBank; slot = S._lastReqSlot; }
  if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
  const raw = Array.from(data);
  if (bank>=0&&bank<=4) {
    if (!S.sysexBanks[4]) S.sysexBanks[4] = Array(4).fill(null);
    const maxSlot = bank === 4 ? 3 : 127;
    if (slot >= 0 && slot <= maxSlot) {
      S.sysexBanks[bank][slot] = {name, params, raw};
      try { localStorage.setItem(`micron_patch_${bank}_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
    }
  }
  if (bank===S.sysexSelectedBank) S.sysexBank[slot] = {name, params, raw};
  S.patch = {...defaultPatch(), ...params};
  S.sysexLog = `Rx program: "${name}" bank ${BANKS[bank]||bank} slot ${slot}`;
}

function handlePatternSysEx(data) {
  const raw = Array.from(data);
  const parsed = parsePatternDump(data);
  const slot = data[8] & 0x7F;
  const name = parsed?.name || `Pattern ${slot+1}`;
  if (!S.sysexPatterns) S.sysexPatterns = Array(128).fill(null);
  if (slot >= 0 && slot < 128) {
    S.sysexPatterns[slot] = {name, raw};
    try { localStorage.setItem(`micron_pattern_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
  }
  if (parsed) {
    const { len, grid, type, steps } = parsed;
    while (S.patterns.length <= slot) S.patterns.push({name:`Pat ${S.patterns.length+1}`,len:16,grid:0.0625,type:'seq',steps:Array.from({length:64},()=>({notes:[],len:0.0625,prob:100}))});
    S.patterns[slot] = { name, len, grid, type, steps };
  }
  S.sysexLog = `Rx pattern: "${name}" slot ${slot} [${data.length}b]`;
}

function handleContent2SysEx(data) {
  const raw = Array.from(data);
  const slot = data[8] & 0x7F;
  const rhythmParsed = parseRhythmDump(data);
  if (rhythmParsed) {
    const name = rhythmParsed.name;
    if (!S.sysexRhythms) S.sysexRhythms = Array(128).fill(null);
    if (slot >= 0 && slot < 128) {
      S.sysexRhythms[slot] = {name, raw};
      try { localStorage.setItem(`micron_rhythm_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
    }
    while (S.rhythms.length <= slot) S.rhythms.push(defaultRhythm());
    S.rhythms[slot] = { name, len: rhythmParsed.len, grid: rhythmParsed.grid, drums: rhythmParsed.drums };
    S.sysexLog = `Rx rhythm: "${name}" slot ${slot} [${data.length}b]`;
    return;
  }
  const setupParsed = parseSetupDump(data);
  const name = setupParsed?.name || `Setup ${slot+1}`;
  if (!S.sysexSetups) S.sysexSetups = Array(128).fill(null);
  if (slot >= 0 && slot < 128) {
    S.sysexSetups[slot] = {name, raw};
    try { localStorage.setItem(`micron_setup_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
  }
  S.sysexLog = `Rx setup: "${name}" slot ${slot} [${data.length}b]`;
}
