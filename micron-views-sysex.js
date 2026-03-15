import { html } from './micron-ui-core.js';
import { S, defaultRhythm, addToLibrary } from './micron-state.js';
import { requestBank, parsePatchDump, parsePatternDump, parseRhythmDump, requestPattern, requestRhythm } from './micron-sysex.js';
import { BANKS } from './micron-data.js';
import { defaultPatch, sendAllParams } from './micron-patch.js';

const CONTENT_TYPES = ['patch','rhythm','pattern'];
if (!S.sysexContentType) S.sysexContentType = 'patch';

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
          <button class=tbtn onclick=${()=>exportSyx()}>Export as .syx</button>
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

function doRequest() {
  if (S.sysexContentType === 'patch') {
    const msg = [0xF0,0x00,0x00,0x0E,0x22,0x41,S.sysexSelectedBank&0x0F,0x00,S.sysexSelectedSlot&0x7F,0xF7];
    import('./micron-midi.js').then(({midiOut}) => midiOut(msg));
    S.sysexLog = `Requested patch ${S.sysexSelectedSlot} from bank ${BANKS[S.sysexSelectedBank]}`;
  } else if (S.sysexContentType === 'pattern') {
    requestPattern(S.sysexSelectedSlot);
    S.sysexLog = `Requested pattern ${S.sysexSelectedSlot}`;
  } else {
    requestRhythm(S.sysexSelectedSlot);
    S.sysexLog = `Requested rhythm ${S.sysexSelectedSlot}`;
  }
  render();
}

function doRequestAll() {
  if (S.sysexContentType === 'patch') {
    const msg = [0xF0,0x00,0x00,0x0E,0x22,0x41,S.sysexSelectedBank&0x0F,0x01,0x00,0xF7];
    import('./micron-midi.js').then(({midiOut}) => midiOut(msg));
    S.sysexLog = `Requested full bank ${BANKS[S.sysexSelectedBank]}`;
  } else if (S.sysexContentType === 'pattern') {
    import('./micron-sysex.js').then(m=>m.requestAllPatterns());
    S.sysexLog = 'Requested all patterns';
  } else {
    import('./micron-sysex.js').then(m=>m.requestAllRhythms());
    S.sysexLog = 'Requested all rhythms';
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
      const { bank, slot, name, params } = parsed;
      if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
      if (bank>=0&&bank<4&&slot>=0&&slot<128) S.sysexBanks[bank][slot] = {name, params};
      if (bank===S.sysexSelectedBank) S.sysexBank[slot] = {name, params};
      S.patch = {...defaultPatch(), ...params};
      sendAllParams(S.patch);
      S.sysexLog = `Rx patch: "${name}" bank ${BANKS[bank]||bank} slot ${slot}`;
      addToLibrary(name, params, params.category||0);
    }
  } else if (content === 3) {
    const parsed = parsePatternDump(data);
    if (parsed) {
      const { slot, name, len, grid, type, steps } = parsed;
      if (slot >= 0 && slot < S.patterns.length) {
        S.patterns[slot] = { name, len, grid, type, steps };
      } else if (slot >= S.patterns.length) {
        while (S.patterns.length <= slot) S.patterns.push({name:`Pat ${S.patterns.length+1}`,len:16,grid:0.0625,type:'seq',steps:Array.from({length:64},()=>({notes:[],len:0.0625,prob:100}))});
        S.patterns[slot] = { name, len, grid, type, steps };
      }
      S.sysexLog = `Rx pattern: "${name}" slot ${slot}`;
    } else {
      S.sysexLog = `Rx pattern data [${data.length}b] (unrecognized format)`;
    }
  } else if (content === 2) {
    const parsed = parseRhythmDump(data);
    if (parsed) {
      const { slot, name, len, grid, drums } = parsed;
      if (slot >= 0 && slot < S.rhythms.length) {
        S.rhythms[slot] = { name, len, grid, drums };
      } else if (slot >= S.rhythms.length) {
        while (S.rhythms.length <= slot) S.rhythms.push(defaultRhythm());
        S.rhythms[slot] = { name, len, grid, drums };
      }
      S.sysexLog = `Rx rhythm: "${name}" slot ${slot}`;
    } else {
      S.sysexLog = `Rx setup/rhythm data [${data.length}b]`;
    }
  }
  render();
}

function loadBankPatch(p, i) {
  S.patch = {...defaultPatch(), ...p.params};
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

function exportSyx() {
  const bank = S.sysexBanks&&S.sysexBanks[S.sysexSelectedBank] || S.sysexBank;
  const patches = bank.filter(Boolean);
  if(!patches.length) { alert('No patches in bank to export'); return; }
  const bytes = patches.flatMap(() => [0xF0,0x00,0x00,0x0E,0x22,...Array(373).fill(0),0xF7]);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type:'application/octet-stream'}));
  Object.assign(document.createElement('a'), {href:url, download:'micron-bank.syx'}).click();
  URL.revokeObjectURL(url);
}
