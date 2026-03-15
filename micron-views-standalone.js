import { html } from './micron-ui-core.js';
import { S, saveState } from './micron-state.js';
import { sendPatternSysEx, sendRhythmSysEx, requestBankIndividual } from './micron-sysex.js';
import { BANKS } from './micron-data.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

function ensureState() {
  if (!S.standaloneSlots) S.standaloneSlots = {};
  if (S.sendProgress === undefined) S.sendProgress = null;
  if (!S.syncProgress) S.syncProgress = null;
  if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
}

function patchCount() {
  if (!S.sysexBanks) return 0;
  return S.sysexBanks.slice(0, 4).reduce((n,b) => n + b.filter(Boolean).length, 0);
}

function hintToggle(key, text) {
  const open = S.collapsedSections['hint_'+key];
  return html`<span>
    <button class=hint-toggle onclick=${()=>{S.collapsedSections['hint_'+key]=!open;render();}} title="Show instructions">?</button>
    ${open?html`<span class=hint-box>${text}</span>`:null}
  </span>`;
}

export function renderStandaloneTab() {
  ensureState();
  const syncing = S.syncProgress && S.syncProgress.done < S.syncProgress.total;
  const patCount = S.patterns.filter(p=>p.steps&&p.steps.some(s=>s.notes&&s.notes.length)).length;
  const rCount = S.rhythms.filter(r=>r.drums&&r.drums.some(d=>d.steps&&d.steps.some(s=>s.active))).length;
  return html`<div>
    <div class=section>
      <div class=standalone-stats>
        <div class=stat-badge><span class=stat-num>${patchCount()}</span><span class=stat-label>/ 512 patches</span></div>
        <div class=stat-badge><span class=stat-num>${patCount}</span><span class=stat-label>/ ${S.patterns.length} patterns</span></div>
        <div class=stat-badge><span class=stat-num>${rCount}</span><span class=stat-label>/ ${S.rhythms.length} rhythms</span></div>
      </div>
    </div>

    <div class=section>
      <h4>Backup from Synth ${hintToggle('backup','Requests all 512 patches (4 banks × 128) via SysEx. Takes ~2 min. Patterns/rhythms must be sent from the Micron: [patterns/rhythms] → push knob → Send MIDI sysex?')}</h4>
      ${S.syncProgress ? html`<div class=send-progress>
        <div class=progress-bar style=${'width:'+Math.round(S.syncProgress.done/S.syncProgress.total*100)+'%'}></div>
        <span>${S.syncProgress.label||''} ${S.syncProgress.done} / ${S.syncProgress.total}</span>
        ${S.syncProgress.done >= S.syncProgress.total ? html`<span class=ok> Requests sent — waiting for synth responses</span>` : null}
      </div>` : null}
      ${S.syncProgress?.startedAt ? html`<div class=hint>Last backup: ${new Date(S.syncProgress.startedAt).toLocaleTimeString()}</div>` : null}
      <div class=btn-group>
        <button class=${'tbtn'+(syncing?' disabled':'')} onclick=${()=>requestEverything()}>Force Re-sync</button>
        <button class=tbtn onclick=${()=>{S.syncProgress=null;render();}}>Clear</button>
      </div>
    </div>

    <div class=section>
      <h4>Send to Synth ${hintToggle('send','Uploads all local patterns and rhythms to the Micron.')}</h4>
      ${S.sendProgress !== null ? html`<div class=send-progress>
        <div class=progress-bar style=${'width:'+Math.round(S.sendProgress.done/S.sendProgress.total*100)+'%'}></div>
        <span>${S.sendProgress.done} / ${S.sendProgress.total} sent</span>
        ${S.sendProgress.done >= S.sendProgress.total ? html`<span class=ok> Done!</span>` : null}
      </div>` : null}
      <div class=btn-group>
        <button class=${'tbtn'+(S.sendProgress&&S.sendProgress.done<S.sendProgress.total?' disabled':'')} onclick=${()=>sendEverything()}>Send Everything to Micron</button>
        <button class=tbtn onclick=${()=>{S.sendProgress=null;render();}}>Clear Status</button>
      </div>
    </div>

    <div class=section>
      <h4>Patterns ${hintToggle('pat','On Micron: [patterns] → turn knob → push knob → "Send MIDI sysex?" → confirm.')}</h4>
      <div class=standalone-list>
        ${S.patterns.map((p,i)=>html`<div class=standalone-slot>
          <span class=slot-name>${p.name||'(empty)'}</span>
          <span class=slot-info>${p.len} steps · ${p.type}</span>
          <label>Slot</label>
          <input type=number min=0 max=127 value=${getSlot('p',i)} oninput=${e=>setSlot('p',i,+e.target.value)} class=num-in style="width:52px" />
          <button class=tbtn onclick=${()=>sendPatternNow(p,i)}>Send to Synth</button>
        </div>`)}
      </div>
    </div>

    <div class=section>
      <h4>Rhythms ${hintToggle('rhy','On Micron: [rhythms] → select rhythm → push knob → "Send MIDI sysex?" → confirm.')}</h4>
      <div class=standalone-list>
        ${S.rhythms.map((r,i)=>html`<div class=standalone-slot>
          <span class=slot-name>${r.name||'(empty)'}</span>
          <span class=slot-info>${r.len} steps · ${r.drums.length} drums</span>
          <label>Slot</label>
          <input type=number min=0 max=127 value=${getSlot('r',i)} oninput=${e=>setSlot('r',i,+e.target.value)} class=num-in style="width:52px" />
          <button class=tbtn onclick=${()=>sendRhythmNow(r,i)}>Send to Synth</button>
        </div>`)}
      </div>
    </div>

    <div class=section>
      <h4>Patches by Bank</h4>
      ${BANKS.map((bname,bi)=>html`<div>
        <b>${bname}</b> — ${(S.sysexBanks[bi]||[]).filter(Boolean).length} / 128 received
        <button class=tbtn onclick=${()=>requestBankIndividual(S, bi, ()=>render())}>Request ${bname}</button>
      </div>`)}
      <div class=standalone-list style="margin-top:8px">
        ${(S.sysexBanks[S.sysexSelectedBank]||[]).map((p,i)=>p?html`<div class=standalone-slot>
          <span class=slot-name>${p.name}</span>
          <span class=slot-info>${BANKS[S.sysexSelectedBank]} slot ${i}</span>
        </div>`:null)}
      </div>
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

function sendPatternNow(p, i) {
  sendPatternSysEx(p, getSlot('p', i));
}

function sendRhythmNow(r, i) {
  sendRhythmSysEx(r, getSlot('r', i));
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
  const mainBanks = BANKS.length - 1;
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
