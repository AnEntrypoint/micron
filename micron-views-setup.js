import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { requestSetup, sendRawSysEx, parseSetupDump } from './micron-sysex.js';

let render = () => {};
export function setRender(fn) { render = fn; }

function getParts(s) {
  if (!s?.raw) return s?.parts || [];
  try {
    const parsed = parseSetupDump(new Uint8Array(s.raw));
    return parsed?.parts || [];
  } catch(_) { return s.parts || []; }
}

function partLabel(type) {
  if (type === 1) return 'Beat';
  if (type === 2) return 'Part';
  if (type === 3) return 'Part';
  return `T${type}`;
}

function downloadBytes(bytes, filename) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type:'application/octet-stream'}));
  Object.assign(document.createElement('a'), {href:url, download:filename}).click();
  URL.revokeObjectURL(url);
}

function doSend(s, slot) {
  if (!s?.raw) return;
  const r = [...s.raw]; r[8] = slot & 0x7F;
  sendRawSysEx(r);
  S.sysexLog = `Sent setup "${s.name}" → slot ${slot}`;
  render();
}

function doExport(s) {
  if (!s?.raw) return;
  downloadBytes(s.raw, `setup-${s.name.replace(/[^a-z0-9]/gi,'-').toLowerCase()}.syx`);
}

function doRename(slot, name) {
  if (!S.sysexSetups[slot]) return;
  S.sysexSetups[slot] = { ...S.sysexSetups[slot], name };
  try { localStorage.setItem(`micron_setup_${slot}`, JSON.stringify({name, raw: S.sysexSetups[slot].raw})); } catch(_) {}
  render();
}

async function reqAll() {
  for (let i = 0; i < 128; i++) { requestSetup(i); await new Promise(r => setTimeout(r, 150)); }
  S.sysexLog = 'Requested 128 setups'; render();
}

function renderDetail(slot) {
  const s = S.sysexSetups[slot];
  if (!s) return html`<div class=section style="color:var(--text2);font-size:11px">Slot ${slot} — not loaded</div>`;
  const parts = getParts(s);
  const sendSlot = S.setupSendSlot ?? slot;
  return html`<div class=section>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-family:Orbitron,sans-serif;font-size:10px;color:var(--cyan);letter-spacing:1px">SETUP ${slot}</span>
      ${S.setupRenaming === slot
        ? html`<input class=name-in autofocus value=${S._setupRenameVal??s.name}
            oninput=${e=>{S._setupRenameVal=e.target.value;}}
            onblur=${()=>{doRename(slot,S._setupRenameVal??s.name);S.setupRenaming=null;S._setupRenameVal=null;}}
            onkeydown=${e=>{if(e.key==='Enter'||e.key==='Escape'){doRename(slot,S._setupRenameVal??s.name);S.setupRenaming=null;S._setupRenameVal=null;render();}}} />`
        : html`<span style="font-size:13px;font-weight:600;color:var(--text);cursor:pointer" title="Click to rename"
            onclick=${()=>{S.setupRenaming=slot;S._setupRenameVal=s.name;render();}}>${s.name}</span>`}
      <span style="font-size:9px;color:var(--text3)">(click name to rename)</span>
    </div>
    ${parts.length ? html`<div style="margin-bottom:8px">
      <div style="font-size:9px;color:var(--text2);margin-bottom:4px;letter-spacing:1px">PARTS</div>
      ${parts.map((p,i)=>html`<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:9px;color:var(--text3);min-width:32px">${partLabel(p.type)}</span>
        <span style="font-size:11px;color:var(--text)">${p.name}</span>
        <span style="font-size:9px;color:var(--text3)">ref:${p.ref}</span>
      </div>`)}
    </div>` : html`<div style="font-size:10px;color:var(--text3);margin-bottom:8px">No parts decoded</div>`}
    <div class=pr>
      <label>Send to slot</label>
      <input type=number class=num-in min=0 max=127 value=${sendSlot}
        oninput=${e=>{S.setupSendSlot=Math.max(0,Math.min(127,+e.target.value));}} />
      <button class=tbtn onclick=${()=>doSend(s, S.setupSendSlot??slot)}>▶ Send</button>
      <button class=tbtn onclick=${()=>doExport(s)}>⬇ Export</button>
    </div>
  </div>`;
}

export function renderSetupTab() {
  const filter = (S.setupTabFilter || '').toLowerCase();
  const selected = S.setupTabSelected ?? null;
  const reqSlot = S.setupReqSlot2 ?? 0;
  const setups = S.sysexSetups || [];
  const loaded = setups.filter(Boolean).length;

  return html`<div>
    <div class=section>
      <h4>Setups (${loaded}/128)</h4>
      <div class=pr>
        <input class=search-in placeholder="Filter setups..." value=${S.setupTabFilter||''}
          oninput=${e=>{S.setupTabFilter=e.target.value;render();}} style="flex:1;margin:0" />
        <input type=number class=num-in min=0 max=127 value=${reqSlot} style="width:50px"
          oninput=${e=>{S.setupReqSlot2=Math.max(0,Math.min(127,+e.target.value));}} />
        <button class=tbtn onclick=${()=>{requestSetup(S.setupReqSlot2??0);S.sysexLog=`Requested setup #${S.setupReqSlot2??0}`;render();}}>Req</button>
        <button class=tbtn onclick=${reqAll}>Req All</button>
      </div>
      <div class=bank-grid style="max-height:260px">
        ${setups.slice(0,128).map((s,i)=>{
          if (filter && s && !s.name.toLowerCase().includes(filter)) return null;
          const active = selected === i;
          return html`<div
            class=${'bank-cell'+(s?' loaded':'')+(active?' lib-focus':'')}
            title=${s?s.name:''}
            onclick=${()=>{S.setupTabSelected=(active?null:i);render();}}>
            <span class=bc-num>${i}</span>
            <span class=bc-name>${s?s.name:'—'}</span>
          </div>`;
        })}
      </div>
    </div>
    ${selected !== null ? renderDetail(selected) : null}
    <div class=syx-log style="margin-top:4px">${S.sysexLog||'No SysEx activity.'}</div>
  </div>`;
}
