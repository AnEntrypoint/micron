import { html } from './micron-ui-core.js';
import { S, saveState } from './micron-state.js';
import { sendPatternSysEx, sendRhythmSysEx, requestBankIndividual, sendRawSysEx } from './micron-sysex.js';
import { startCapture, stopCapture } from './micron-sysex-handler.js';
import { BANKS } from './micron-data.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

function ensureState() {
  if (!S.standaloneSlots) S.standaloneSlots = {};
  if (S.sendProgress === undefined) S.sendProgress = null;
  if (!S.syncProgress) S.syncProgress = null;
  if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
  if (!S.sysexRhythms) S.sysexRhythms = Array(128).fill(null);
}

function patchCount() {
  return S.sysexBanks ? S.sysexBanks.slice(0,4).reduce((n,b) => n+b.filter(Boolean).length, 0) : 0;
}

export function renderStandaloneTab() {
  ensureState();
  const syncing = S.syncProgress && S.syncProgress.done < S.syncProgress.total;
  const setupCount = (S.sysexSetups||[]).filter(Boolean).length;
  const rhythmCount = (S.sysexRhythms||[]).filter(Boolean).length;
  const patCount = (S.sysexPatterns||[]).filter(Boolean).length;
  return html`<div>
    <div class=section style="border:2px solid var(--accent);padding:12px">
      <h4 style="margin:0 0 8px">Receive from Synth: "Sysex: send all"</h4>
      <p style="margin:0 0 8px;opacity:0.85">On the Micron: <b>Config → Sysex: send all → push knob</b>. The synth streams all programs, setups, patterns and rhythms. This app receives them automatically.</p>
      <div class=standalone-stats>
        <div class=stat-badge><span class=stat-num>${patchCount()}</span><span class=stat-label>/ 512 programs</span></div>
        <div class=stat-badge><span class=stat-num>${setupCount}</span><span class=stat-label>setups</span></div>
        <div class=stat-badge><span class=stat-num>${patCount}</span><span class=stat-label>patterns</span></div>
        <div class=stat-badge><span class=stat-num>${rhythmCount}</span><span class=stat-label>rhythms</span></div>
      </div>
      <p style="margin:8px 0 0;font-size:0.85em;opacity:0.7">Or send items individually: select item on Micron → push knob → "Send MIDI sysex?"</p>
      <div class=btn-group style="margin-top:8px">
        <button class=tbtn onclick=${()=>{startCapture();render();}}>Start Capture</button>
        <button class=tbtn onclick=${()=>{stopCapture();render();}}>Stop & Save .syx</button>
      </div>
    </div>

    <div class=section>
      <h4>Backup Patches (request via SysEx)</h4>
      ${S.syncProgress ? html`<div class=send-progress>
        <div class=progress-bar style=${'width:'+Math.round(S.syncProgress.done/S.syncProgress.total*100)+'%'}></div>
        <span>${S.syncProgress.label||''} ${S.syncProgress.done} / ${S.syncProgress.total}</span>
      </div>` : null}
      <div class=btn-group>
        <button class=${'tbtn'+(syncing?' disabled':'')} onclick=${()=>requestEverything()}>Request All Patches</button>
        <button class=tbtn onclick=${()=>{S.syncProgress=null;render();}}>Clear</button>
      </div>
    </div>

    ${setupCount ? html`<div class=section>
      <h4>Setups (${setupCount})</h4>
      <div class=standalone-list>
        ${(S.sysexSetups||[]).map((s,i)=>s?html`<div class=standalone-slot>
          <span class=slot-name>${s.name}</span>
          <span class=slot-info>Slot ${i}</span>
          ${s.raw?html`<button class=tbtn onclick=${()=>{sendRawSysEx(s.raw);render();}}>Send to Synth</button>`:null}
        </div>`:null)}
      </div>
    </div>` : null}

    <div class=section>
      <h4>Send to Synth</h4>
      ${S.sendProgress !== null ? html`<div class=send-progress>
        <div class=progress-bar style=${'width:'+Math.round(S.sendProgress.done/S.sendProgress.total*100)+'%'}></div>
        <span>${S.sendProgress.done} / ${S.sendProgress.total} sent</span>
      </div>` : null}
      <div class=btn-group>
        <button class=${'tbtn'+(S.sendProgress&&S.sendProgress.done<S.sendProgress.total?' disabled':'')} onclick=${()=>sendEverything()}>Send Everything to Micron</button>
        <button class=tbtn onclick=${()=>{S.sendProgress=null;render();}}>Clear</button>
      </div>
    </div>

    <div class=section>
      <h4>Patterns</h4>
      <div class=standalone-list>
        ${S.patterns.map((p,i)=>html`<div class=standalone-slot>
          <span class=slot-name>${p.name||'(empty)'}</span>
          <span class=slot-info>${p.len} steps · ${p.type}</span>
          <label>Slot</label>
          <input type=number min=0 max=127 value=${getSlot('p',i)} oninput=${e=>setSlot('p',i,+e.target.value)} class=num-in style="width:52px" />
          <button class=tbtn onclick=${()=>sendPatternSysEx(p,getSlot('p',i))}>Send</button>
        </div>`)}
      </div>
    </div>

    <div class=section>
      <h4>Rhythms</h4>
      <div class=standalone-list>
        ${S.rhythms.map((r,i)=>html`<div class=standalone-slot>
          <span class=slot-name>${r.name||'(empty)'}</span>
          <span class=slot-info>${r.len} steps · ${r.drums.length} drums</span>
          <label>Slot</label>
          <input type=number min=0 max=127 value=${getSlot('r',i)} oninput=${e=>setSlot('r',i,+e.target.value)} class=num-in style="width:52px" />
          <button class=tbtn onclick=${()=>sendRhythmSysEx(r,getSlot('r',i))}>Send</button>
        </div>`)}
      </div>
    </div>

    <div class=section>
      <h4>Patches by Bank</h4>
      ${BANKS.slice(0,4).map((bname,bi)=>html`<div>
        <b>${bname}</b> — ${(S.sysexBanks[bi]||[]).filter(Boolean).length} / 128
        <button class=tbtn onclick=${()=>requestBankIndividual(S, bi, ()=>render())}>Request</button>
      </div>`)}
    </div>
  </div>`;
}

function getSlot(type, i) {
  if (!S.standaloneSlots) S.standaloneSlots = {};
  return S.standaloneSlots[type+i] ?? i;
}

function setSlot(type, i, v) {
  if (!S.standaloneSlots) S.standaloneSlots = {};
  S.standaloneSlots[type+i] = v;
  saveState();
}

async function sendEverything() {
  const items = [];
  S.patterns.forEach((p,i) => items.push({type:'pattern', data:p, idx:i}));
  S.rhythms.forEach((r,i) => items.push({type:'rhythm', data:r, idx:i}));
  S.sendProgress = {done:0, total:items.length};
  render();
  for (const item of items) {
    if (item.type === 'pattern') sendPatternSysEx(item.data, getSlot('p', item.idx));
    else sendRhythmSysEx(item.data, getSlot('r', item.idx));
    S.sendProgress.done++;
    render();
    await new Promise(res => setTimeout(res, 50));
  }
}

async function requestEverything() {
  const mainBanks = 4;
  const total = mainBanks * 128 + 4;
  S.syncProgress = { done: 0, total, label: 'Starting', startedAt: Date.now() };
  render();
  for (let b = 0; b < mainBanks; b++) {
    S.syncProgress.label = `Bank ${BANKS[b]}`;
    await requestBankIndividual(S, b, s => {
      S.syncProgress.done = b * 128 + Math.min(s, 128);
      render();
    });
  }
  S.syncProgress.label = 'Edit Bank';
  const { requestPatch } = await import('./micron-sysex.js');
  for (let s = 0; s < 4; s++) {
    S._lastReqBank = 4; S._lastReqSlot = s;
    requestPatch(4, s);
    await new Promise(r => setTimeout(r, 500));
    S.syncProgress.done = mainBanks * 128 + s + 1;
    render();
  }
  S.syncProgress.label = 'Done';
  S.syncProgress.done = total;
  render();
}
