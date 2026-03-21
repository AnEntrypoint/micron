import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { parsePatchDump, requestPatch, sendPatchDump, storePatchToBank, sendRawSysEx } from './micron-sysex.js';
import { BANKS } from './micron-data.js';
import { defaultPatch, sendAllParams } from './micron-patch.js';
import { sendProgramChange } from './micron-midi.js';
import { handleSysEx, setHandlerRender, restoreFromStorage, startCapture, stopCapture, resetRxCounters } from './micron-sysex-handler.js';

export { handleSysEx };
window._startCapture = startCapture;
window._stopCapture = stopCapture;

if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
if (!S.sysexPatterns) S.sysexPatterns = Array(256).fill(null);
if (!S.sysexSetups) S.sysexSetups = Array(256).fill(null);
if (!S.sysexRhythms) S.sysexRhythms = Array(256).fill(null);
if (!S.storeSlot) S.storeSlot = 0;
restoreFromStorage();

let render = ()=>{};
export function setRender(fn) { render=fn; setHandlerRender(fn); }

export function renderSysExTab() {
  return html`<div>
    <div class=grid2>
      <div class=section>
        <h4>Backup</h4>
        <div class=btn-group>
          <button class=tbtn onclick=${()=>importSyx()}>Import .syx</button>
          <button class=tbtn onclick=${()=>exportSyx()}>Export Bank</button>
          <button class=tbtn onclick=${()=>exportAllSyx()}>Export All</button>
        </div>
      </div>
      <div class=section>
        <h4>Status</h4>
        <div class=syx-counts>
          ${[0,1,2,3].map(b=>html`<span class=syx-count-badge>${BANKS[b]}: <b>${(S.sysexBanks[b]||[]).filter(Boolean).length}</b></span>`)}
          <span class=syx-count-badge>Patterns: <b>${(S.sysexPatterns||[]).filter(Boolean).length}</b></span>
          <span class=syx-count-badge>Setups: <b>${(S.sysexSetups||[]).filter(Boolean).length}</b></span>
          <span class=syx-count-badge>Rhythms: <b>${(S.sysexRhythms||[]).filter(Boolean).length}</b></span>
        </div>
        <div class=syx-log>${S.sysexLog||'No SysEx activity yet.'}</div>
      </div>
    </div>
    ${renderPatchBanks()}
    ${renderSetups()}
  </div>`;
}

function renderPatchBanks() {
  const bi = S.sysexSelectedBank;
  return html`<div class=section>
    <h4>Patch Banks</h4>
    <div class=pr>
      <label>View Bank</label>
      <select onchange=${e=>{S.sysexSelectedBank=+e.target.value;render();}}>
        ${BANKS.map((b,i)=>html`<option value=${i} selected=${bi===i}>${b} (${(S.sysexBanks[i]||[]).filter(Boolean).length}/128)</option>`)}
      </select>
    </div>
    <input placeholder="Search patches..." value=${S.sysexBankFilter} oninput=${e=>{S.sysexBankFilter=e.target.value;render();}} class=search-in />
    <div class=bank-grid>
      ${(S.sysexBanks[bi]||[]).map((p,i)=>{
        if (S.sysexBankFilter && p && !p.name.toLowerCase().includes(S.sysexBankFilter.toLowerCase())) return null;
        return html`<div class=${'bank-cell'+(p?' loaded':'')} title=${p?p.name:''} onclick=${()=>{if(p) loadBankPatch(p,i);}}>
          <span class=bc-num>${i+1}</span>
          <span class=bc-name>${p?p.name:'—'}</span>
          ${p?html`<span class=bc-actions>
            <button class=bc-recall title="Recall on synth" onclick=${ev=>{ev.stopPropagation();recallOnSynth(bi,i);}}>▶</button>
            ${p.raw?html`<button class=bc-recall title="Store to Yellow bank" onclick=${ev=>{ev.stopPropagation();doStore(p,i);}}>⬆</button>`:null}
          </span>`:null}
        </div>`;
      })}
    </div>
    <div class=pr style="margin-top:8px">
      <label>Store to Yellow slot</label>
      <input type=number min=0 max=127 value=${S.storeSlot||0} oninput=${e=>{S.storeSlot=Math.max(0,Math.min(127,+e.target.value));}} class=num-in />
      <button class=tbtn onclick=${()=>loadFromSynth()}>Load from Synth</button>
    </div>
  </div>`;
}

function renderSetups() {
  const setups = (S.sysexSetups||[]).filter(Boolean);
  const rhythms = (S.sysexRhythms||[]).filter(Boolean);
  if (!setups.length && !rhythms.length) return null;
  return html`<div class=grid2>
    ${setups.length ? html`<div class=section>
      <h4>Setups (${setups.length})</h4>
      <div class=standalone-list>
        ${(S.sysexSetups||[]).map((s,i)=>s?html`<div class=standalone-slot>
          <span class=slot-name>${s.name}</span><span class=slot-info>Slot ${i}</span>
          ${s.raw?html`<button class=tbtn onclick=${()=>{sendRawSysEx(s.raw);S.sysexLog='Sent setup "'+s.name+'"';render();}}>Send</button>`:null}
        </div>`:null)}
      </div>
    </div>` : null}
    ${rhythms.length ? html`<div class=section>
      <h4>Rhythms (${rhythms.length})</h4>
      <div class=standalone-list>
        ${(S.sysexRhythms||[]).map((r,i)=>r?html`<div class=standalone-slot>
          <span class=slot-name>${r.name}</span><span class=slot-info>Slot ${i}</span>
          ${r.raw?html`<button class=tbtn onclick=${()=>{sendRawSysEx(r.raw);S.sysexLog='Sent rhythm "'+r.name+'"';render();}}>Send</button>`:null}
        </div>`:null)}
      </div>
    </div>` : null}
  </div>`;
}

function doStore(p, fromSlot) {
  if (!p.raw) return;
  storePatchToBank(p.raw, 3, S.storeSlot ?? fromSlot);
  S.sysexLog = `Stored "${p.name}" to Yellow slot ${S.storeSlot??fromSlot}`;
  render();
}

function recallOnSynth(bank, slot) {
  sendProgramChange(bank, slot);
  S._lastReqBank = 4; S._lastReqSlot = 0;
  setTimeout(() => { requestPatch(4, 0); render(); }, 150);
  render();
}

function loadFromSynth() {
  sendProgramChange(S.sysexSelectedBank, S.sysexSelectedSlot);
  S._lastReqBank = 4; S._lastReqSlot = 0;
  setTimeout(() => { requestPatch(4, 0); render(); }, 150);
  render();
}

function loadBankPatch(p, i) {
  let params = p.params;
  if (p.raw) {
    const parsed = parsePatchDump(new Uint8Array(p.raw));
    if (parsed) params = parsed.params;
    sendPatchDump(p.raw);
  } else sendAllParams({...defaultPatch(), ...(params || {})});
  S.patch = {...defaultPatch(), ...(params || {})};
  S.sysexLog = `Loaded "${p.name}" (slot ${i+1})`;
  render();
}

function importSyx() {
  const input = Object.assign(document.createElement('input'), {type:'file', accept:'.syx,.bin,.mid'});
  input.onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const d = new Uint8Array(ev.target.result);
      resetRxCounters();
      let i=0, count=0;
      while(i<d.length) {
        if(d[i]!==0xF0) { i++; continue; }
        const end=d.indexOf(0xF7,i); if(end<0) break;
        const msg = d.slice(i,end+1);
        if (msg[1]===0&&msg[2]===0&&msg[3]===0x0E&&(msg[4]===0x22||msg[4]===0x26)) { handleSysEx(msg); count++; }
        i=end+1;
      }
      S.sysexLog=`Imported ${count} SysEx messages`; render();
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
  const bank = S.sysexBanks?.[S.sysexSelectedBank] || S.sysexBank;
  const withRaw = (bank||[]).filter(p=>p?.raw);
  if (!withRaw.length) { alert('No patches in this bank.'); return; }
  const name = (BANKS[S.sysexSelectedBank]||'bank').toLowerCase().replace(/\s/g,'-');
  downloadBytes(withRaw.flatMap(p=>p.raw), `micron-${name}.syx`);
}

function exportAllSyx() {
  const all = [
    ...(S.sysexBanks||[]).flatMap(b=>(b||[]).filter(p=>p?.raw).flatMap(p=>p.raw)),
    ...(S.sysexPatterns||[]).filter(p=>p?.raw).flatMap(p=>p.raw),
    ...(S.sysexSetups||[]).filter(p=>p?.raw).flatMap(p=>p.raw),
    ...(S.sysexRhythms||[]).filter(p=>p?.raw).flatMap(p=>p.raw),
  ];
  if (!all.length) { alert('Nothing backed up yet.'); return; }
  downloadBytes(all, 'micron-full-backup.syx');
  S.sysexLog = 'Exported full backup';
  render();
}
