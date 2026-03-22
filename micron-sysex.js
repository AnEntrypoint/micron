import { midiOut } from './micron-midi.js';

export { parsePatchDump, parsePatternDump, parseRhythmDump, parseSetupDump, extractParams } from './micron-sysex-parse.js';

const ALESIS_HDR = [0xF0, 0x00, 0x00, 0x0E, 0x22];


function buildMicronSysEx(content, bank, slot, dataBytes) {
  const padded = [...dataBytes];
  while (padded.length % 7 !== 0) padded.push(0);
  const packed = pack7of8(padded);
  return [...ALESIS_HDR, 0x42, content, bank & 0x0F, slot & 0x7F, ...packed, 0xF7];
}

export function sendPatternSysEx(pattern, slot) {
  const nameBytes = Array.from({length:14}, (_,i) => pattern.name.charCodeAt(i)||0);
  const data = [...nameBytes, 0, pattern.len & 0xFF, pattern.grid ? Math.round(1/pattern.grid) : 16, pattern.type==='arp'?1:0];
  pattern.steps.slice(0, pattern.len).forEach(s => {
    data.push(s.notes.length ? (s.notes[0].pitch & 0x7F) : 0xFF);
    data.push(s.notes.length ? (s.notes[0].vel & 0x7F) : 0);
    data.push(s.notes.length ? Math.min(127, Math.round(s.notes[0].len * 16)) : 0);
  });
  midiOut(buildMicronSysEx(3, 3, slot, data));
}

export function sendRhythmSysEx(rhythm, slot) {
  const nameBytes = Array.from({length:14}, (_,i) => rhythm.name.charCodeAt(i)||0);
  const data = [...nameBytes, 0, rhythm.len & 0xFF, rhythm.grid ? Math.round(1/rhythm.grid) : 16, rhythm.drums.length & 0xFF];
  rhythm.drums.forEach(drum => {
    const pname = Array.from({length:14}, (_,i) => (drum.program||'').charCodeAt(i)||0);
    data.push(...pname, 0, drum.level & 0x7F, (drum.pan+50) & 0x7F);
    drum.steps.slice(0,64).forEach(s => { data.push(s.active ? (s.vel & 0x7F) : 0); });
  });
  midiOut(buildMicronSysEx(2, 3, slot, data));
}

export function pack7of8(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length; i += 7) {
    const chunk = bytes.slice(i, i + 7);
    let msb = 0;
    chunk.forEach((b, j) => { if (b & 0x80) msb |= (1 << (6-j)); });
    out.push(msb & 0x7F);
    chunk.forEach(b => out.push(b & 0x7F));
  }
  return out;
}

export function unpack7of8(data) {
  const out = [];
  for (let i = 0; i < data.length; i += 8) {
    const msb = data[i];
    for (let j = 1; j <= 7 && (i+j) < data.length; j++) {
      out.push((data[i+j] & 0x7F) | (((msb >> (7-j)) & 1) << 7));
    }
  }
  return out;
}

export function sendPatchDump(raw) {
  if (!raw || !raw.length) return;
  const msg = Array.from(raw instanceof Uint8Array ? raw : new Uint8Array(raw));
  midiOut(msg);
}

export function storePatchToBank(raw, bank, slot) {
  if (!raw || !raw.length) return;
  const msg = Array.from(raw instanceof Uint8Array ? raw : new Uint8Array(raw));
  msg[6] = bank & 0x0F;
  msg[8] = slot & 0x7F;
  midiOut(msg);
}

export function sendRawSysEx(raw) {
  if (!raw || !raw.length) return;
  midiOut(Array.from(raw instanceof Uint8Array ? raw : new Uint8Array(raw)));
}

export function requestPatch(bank, slot) {
  midiOut([0xF0, 0x00, 0x00, 0x0E, 0x22, 0x41, bank & 0x0F, 0x00, slot & 0x7F, 0xF7]);
}

export function requestRhythm(slot) {
  midiOut([0xF0, 0x00, 0x00, 0x0E, 0x22, 0x41, 0x02, 0x00, slot & 0x7F, 0xF7]);
}

export function requestSetup(slot) {
  midiOut([0xF0, 0x00, 0x00, 0x0E, 0x22, 0x41, 0x01, 0x00, slot & 0x7F, 0xF7]);
}


export function waitForSlot(S, bankIdx, slot, timeoutMs) {
  return new Promise(res => {
    const start = Date.now();
    const check = setInterval(() => {
      if (S.sysexBanks?.[bankIdx]?.[slot]) { clearInterval(check); res(true); return; }
      if (Date.now() - start > timeoutMs) { clearInterval(check); res(false); }
    }, 50);
  });
}

export async function requestBankIndividual(S, bankIdx, onProgress) {
  if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
  for (let s = 0; s < 128; s++) {
    for (let attempt = 0; attempt < 3; attempt++) {
      S._lastReqBank = bankIdx;
      S._lastReqSlot = s;
      requestPatch(bankIdx, s);
      const ok = await waitForSlot(S, bankIdx, s, 1000);
      if (ok) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 200));
    }
    if (s % 8 === 0 && onProgress) onProgress(s);
    await new Promise(r => setTimeout(r, 50));
  }
  if (onProgress) onProgress(128);
}
