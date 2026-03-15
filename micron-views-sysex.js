import { html } from './micron-ui-core.js';
import { S, defaultRhythm, addToLibrary } from './micron-state.js';
import { parsePatchDump, parsePatternDump, parseRhythmDump, requestBankIndividual } from './micron-sysex.js';
import { BANKS } from './micron-data.js';
import { defaultPatch, sendAllParams } from './micron-patch.js';

const CONTENT_TYPES = ['patch','rhythm','pattern'];
if (!S.sysexContentType) S.sysexContentType = 'patch';
if (!S.sysexBanks) {
  S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
  S.sysexPatterns = Array(128).fill(null);
  S.sysexSetups = Array(128).fill(null);
  let restored = 0;
  for (let b = 0; b < 4; b++) for (let s = 0; s < 128; s++) {
    try { const item = localStorage.getItem(`micron_patch_${b}_${s}`);
      if (item) { const d = JSON.parse(item); S.sysexBanks[b][s] = d; restored++; } } catch(_) {}
  }
  for (let s = 0; s < 128; s++) {
    try { const item = localStorage.getItem(`micron_pattern_${s}`);
      if (item) { S.sysexPatterns[s] = JSON.parse(item); restored++; } } catch(_) {}
    try { const item = localStorage.getItem(`micron_setup_${s}`);
      if (item) { S.sysexSetups[s] = JSON.parse(item); restored++; } } catch(_) {}
  }
  if (restored) console.log(`Restored ${restored} items from localStorage`);
}

let render = ()=>{};
export function setRender(fn) { render=fn; }

export function renderSysExTab() {
  return html`<div>
    <div class=grid2>
      <div class=section>
        <h4>Request from Micron</h4>
        <div class=pr>
          <label>Type</label>
          <select onchange=${e=>{S.sysexContentType=e.target.value;render();}}>
            ${CONTENT_TYPES.map(t=>html`<option value=${t} selected=${S.sysexContentType===t}>${t}</option>`)}
          </select>
        </div>
        ${S.sysexContentType==='patch'?html`<div class=pr>
          <label>Bank</label>
          <select onchange=${e=>{S.sysexSelectedBank=+e.target.value;render();}}>
            ${BANKS.map((b,i)=>html`<option value=${i} selected=${S.sysexSelectedBank===i}>${b}</option>`)}
          </select>
        </div>`:null}
        <div class=pr>
          <label>Slot</label>
          <input type=number min=0 max=127 value=${S.sysexSelectedSlot} oninput=${e=>{S.sysexSelectedSlot=Math.max(0,Math.min(127,+e.target.value));}} class=num-in />
        </div>
        <div class=btn-group>
          <button class=tbtn onclick=${()=>doRequest()}>Request Single</button>
          <button class=tbtn onclick=${()=>doRequestAll()}>Request All</button>
        </div>
        <div class=pr>
          <label>Import .syx</label>
          <button class=tbtn onclick=${()=>importSyx()}>Import SysEx File</button>
        </div>
        <div class=pr>
          <label>Export Bank</label>
          <button class=tbtn onclick=${()=>exportSyx()}>Export Bank .syx</button>
          <button class=tbtn onclick=${()=>exportAllSyx()}>Export All Banks .syx</button>
        </div>
      </div>
      <div class=section>
        <h4>Status</h4>
        <div class=syx-log>${S.sysexLog||'No SysEx activity yet.'}</div>
        <div class=syx-hex id=syx-hex></div>
      </div>
    </div>
    <div class=section>
      <h4>Patch Banks</h4>
      <div class=pr>
        <label>View Bank</label>
        <select onchange=${e=>{S.sysexSelectedBank=+e.target.value;render();}}>
          ${BANKS.map((b,i)=>html`<option value=${i} selected=${S.sysexSelectedBank===i}>${b} (${(S.sysexBanks&&S.sysexBanks[i]||[]).filter(Boolean).length}/128)</option>`)}
        </select>
      </div>
      <input placeholder="Search patches..." value=${S.sysexBankFilter} oninput=${e=>{S.sysexBankFilter=e.target.value;render();}} class=search-in />
      <div class=bank-grid>
        ${(S.sysexBanks&&S.sysexBanks[S.sysexSelectedBank]||S.sysexBank).map((p,i)=>{
          if (S.sysexBankFilter && p && !p.name.toLowerCase().includes(S.sysexBankFilter.toLowerCase())) return null;
          return html`<div class=${'bank-cell'+(p?' loaded':'')} title=${p?p.name:''} onclick=${()=>{if(p){loadBankPatch(p,i);}}}>
            <span class=bc-num>${i+1}</span>
            <span class=bc-name>${p?p.name:'—'}</span>
          </div>`;
        })}
      </div>
    </div>
  </div>`;
}

function doBankRequest(bankIdx) {
  requestBankIndividual(S, bankIdx, s => {
    if (s === 128) {
      S.sysexLog = `Bank ${BANKS[bankIdx]} complete: ${(S.sysexBanks[bankIdx]||[]).filter(Boolean).length}/128 received`;
    }
    render();
  });
}

function doRequest() {
  if (S.sysexContentType === 'patch') {
    import('./micron-midi.js').then(({midiOut}) => {
      S._lastReqBank = S.sysexSelectedBank;
      S._lastReqSlot = S.sysexSelectedSlot;
      midiOut([0xF0,0x00,0x00,0x0E,0x22,0x41,S.sysexSelectedBank&0x0F,0x00,S.sysexSelectedSlot&0x7F,0xF7]);
    });
    S.sysexLog = `Requested patch ${S.sysexSelectedSlot} from bank ${BANKS[S.sysexSelectedBank]}`;
  } else {
    S.sysexLog = 'Patterns/rhythms cannot be requested remotely. Use the Micron menu: select item → push knob → "Send MIDI sysex?"';
  }
  render();
}

function doRequestAll() {
  if (S.sysexContentType === 'patch') {
    doBankRequest(S.sysexSelectedBank);
    S.sysexLog = `Requesting all patches in bank ${BANKS[S.sysexSelectedBank]}...`;
  } else {
    S.sysexLog = 'Patterns/rhythms/setups cannot be requested remotely. On the Micron: select the item → push knob → "Send MIDI sysex?"';
  }
  render();
}

export function handleSysEx(data) {
  const hex = Array.from(data).map(b=>b.toString(16).padStart(2,'0')).join(' ');
  S.sysexLog = `Rx: [${data.length}b] ${hex.slice(0,120)}`;
  if (!(data[1]===0x00&&data[2]===0x00&&data[3]===0x0E&&data[4]===0x22)) { render(); return; }
  const content = data[5];
  if (content === 1) {
    const parsed = parsePatchDump(data);
    if (parsed) {
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
      sendAllParams(S.patch);
      S.sysexLog = `Rx patch: "${name}" bank ${BANKS[bank]||bank} slot ${slot}`;
      addToLibrary(name, params, params.category||0);
    }
  } else if (content === 3) {
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
  } else if (content === 2) {
    const raw = Array.from(data);
    const slot = data[8] & 0x7F;
    const parsed = parseRhythmDump(data);
    const name = parsed?.name || `Setup ${slot+1}`;
    if (!S.sysexSetups) S.sysexSetups = Array(128).fill(null);
    if (slot >= 0 && slot < 128) {
      S.sysexSetups[slot] = {name, raw};
      try { localStorage.setItem(`micron_setup_${slot}`, JSON.stringify({name, raw})); } catch(_) {}
    }
    if (parsed) {
      while (S.rhythms.length <= slot) S.rhythms.push(defaultRhythm());
      S.rhythms[slot] = { name, len: parsed.len, grid: parsed.grid, drums: parsed.drums };
    }
    S.sysexLog = `Rx setup/rhythm: "${name}" slot ${slot} [${data.length}b]`;
  }
  render();
}

function loadBankPatch(p, i) {
  let params = p.params;
  if (p.raw) {
    const parsed = parsePatchDump(new Uint8Array(p.raw));
    if (parsed) params = parsed.params;
  }
  S.patch = {...defaultPatch(), ...params};
  sendAllParams(S.patch);
  S.sysexLog = `Loaded "${p.name}" (slot ${i+1})`;
  render();
}

function importSyx() {
  const input = Object.assign(document.createElement('input'), {type:'file', accept:'.syx,.bin,.mid'});
  input.onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = new Uint8Array(ev.target.result);
      let i=0, count=0;
      while(i<data.length) {
        if(data[i]!==0xF0) { i++; continue; }
        const end=data.indexOf(0xF7,i); if(end<0) break;
        const parsed=parsePatchDump(data.slice(i,end+1));
        if(parsed&&parsed.slot>=0&&parsed.slot<128) { S.sysexBank[parsed.slot]={name:parsed.name,params:parsed.params}; count++; }
        i=end+1;
      }
      S.sysexLog=`Imported ${count} patches from file`; render();
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

function downloadBytes(bytes, filename) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type:'application/octet-stream'}));
  Object.assign(document.createElement('a'), {href:url, download:filename}).click();
  URL.revokeObjectURL(url);
}

function exportSyx() {
  const bank = S.sysexBanks&&S.sysexBanks[S.sysexSelectedBank] || S.sysexBank;
  const withRaw = (bank||[]).filter(p=>p?.raw);
  if (!withRaw.length) { alert('No backed-up patches in this bank. Run backup first.'); return; }
  const bankName = (BANKS[S.sysexSelectedBank]||'bank').toLowerCase().replace(/\s/g,'-');
  downloadBytes(withRaw.flatMap(p=>p.raw), `micron-${bankName}.syx`);
}

function exportAllSyx() {
  const patchRaw = (S.sysexBanks||[]).flatMap(bank => (bank||[]).filter(p=>p?.raw).flatMap(p=>p.raw));
  const patternRaw = (S.sysexPatterns||[]).filter(p=>p?.raw).flatMap(p=>p.raw);
  const setupRaw = (S.sysexSetups||[]).filter(p=>p?.raw).flatMap(p=>p.raw);
  const allRaw = [...patchRaw, ...patternRaw, ...setupRaw];
  if (!allRaw.length) { alert('Nothing backed up yet. Run backup and send patterns/setups from Micron first.'); return; }
  const pCount = (S.sysexBanks||[]).flatMap(b=>b||[]).filter(p=>p?.raw).length;
  const patCount = (S.sysexPatterns||[]).filter(p=>p?.raw).length;
  const sCount = (S.sysexSetups||[]).filter(p=>p?.raw).length;
  downloadBytes(allRaw, 'micron-full-backup.syx');
  S.sysexLog = `Exported: ${pCount} patches, ${patCount} patterns, ${sCount} setups/rhythms → micron-full-backup.syx`;
  render();
}
