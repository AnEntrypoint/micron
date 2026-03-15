import { html } from './micron-ui-core.js';
import { S, saveState } from './micron-state.js';
import { sendPatternSysEx, sendRhythmSysEx, requestPattern, requestRhythm, requestAllPatterns, requestAllRhythms, requestBank } from './micron-sysex.js';
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
  return S.sysexBanks.reduce((n,b) => n + b.filter(Boolean).length, 0);
}

export function renderStandaloneTab() {
  ensureState();
  const syncing = S.syncProgress && S.syncProgress.done < S.syncProgress.total;
  return html`<div>
    <div class=section>
      <h4>Sync from Synth</h4>
      <p class=hint>Request all patches (4 banks × 128 = 512), all patterns (128), all rhythms, and setup from the Micron. Data received via SysEx will populate the editor automatically.</p>
      ${S.syncProgress ? html`<div class=send-progress>
        <div class=progress-bar style=${'width:'+Math.round(S.syncProgress.done/S.syncProgress.total*100)+'%'}></div>
        <span>${S.syncProgress.label||''} ${S.syncProgress.done} / ${S.syncProgress.total}</span>
        ${S.syncProgress.done >= S.syncProgress.total ? html`<span class=ok> Requests sent — waiting for synth responses</span>` : null}
      </div>` : null}
      <div class=sync-summary>
        <span>Patches: <b>${patchCount()}</b> / 512</span>
        <span class=sep></span>
        <span>Patterns: <b>${S.patterns.filter(p=>p.steps.some(s=>s.notes.length)).length}</b> non-empty</span>
        <span class=sep></span>
        <span>Rhythms: <b>${S.rhythms.length}</b></span>
        ${S.syncProgress?.startedAt ? html`<span class=sep></span><span class=hint>Last requested: ${new Date(S.syncProgress.startedAt).toLocaleTimeString()}</span>` : null}
      </div>
      <div class=btn-group>
        <button class=${'tbtn'+(syncing?' disabled':'')} onclick=${()=>requestEverything()}>Request All from Synth</button>
        <button class=tbtn onclick=${()=>{S.syncProgress=null;render();}}>Clear Status</button>
      </div>
    </div>

    <div class=section>
      <h4>Send to Synth</h4>
      <p class=hint>Upload all local patterns and rhythms to the Micron.</p>
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
      <h4>Patterns</h4>
      <div class=standalone-list>
        ${S.patterns.map((p,i)=>html`<div class=standalone-slot>
          <span class=slot-name>${p.name||'(empty)'}</span>
          <span class=slot-info>${p.len} steps · ${p.type}</span>
          <label>Slot</label>
          <input type=number min=0 max=127 value=${getSlot('p',i)} oninput=${e=>setSlot('p',i,+e.target.value)} class=num-in style="width:52px" />
          <button class=tbtn onclick=${()=>sendPatternNow(p,i)}>Send</button>
          <button class=tbtn onclick=${()=>requestPattern(getSlot('p',i))}>Request</button>
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
          <button class=tbtn onclick=${()=>sendRhythmNow(r,i)}>Send</button>
          <button class=tbtn onclick=${()=>requestRhythm(getSlot('r',i))}>Request</button>
        </div>`)}
      </div>
    </div>

    <div class=section>
      <h4>Patches by Bank</h4>
      ${BANKS.map((bname,bi)=>html`<div>
        <b>${bname}</b> — ${(S.sysexBanks[bi]||[]).filter(Boolean).length} / 128 received
        <button class=tbtn onclick=${()=>requestBankIndividual(bi)}>Request ${bname}</button>
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

function waitForSlot(bankIdx, slot, timeoutMs) {
  return new Promise(res => {
    const start = Date.now();
    const check = setInterval(() => {
      if (S.sysexBanks?.[bankIdx]?.[slot]) { clearInterval(check); res(true); return; }
      if (Date.now() - start > timeoutMs) { clearInterval(check); res(false); }
    }, 50);
  });
}

async function requestBankIndividual(bankIdx) {
  const { requestPatch } = await import('./micron-sysex.js');
  for (let s = 0; s < 128; s++) {
    for (let attempt = 0; attempt < 3; attempt++) {
      S._lastReqBank = bankIdx;
      S._lastReqSlot = s;
      requestPatch(bankIdx, s);
      const ok = await waitForSlot(bankIdx, s, 1000);
      if (ok) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 50));
  }
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
  const patchBanks = BANKS.length - 1;
  const total = patchBanks * 128 + 2;
  S.syncProgress = { done: 0, total, label: 'Patches', startedAt: Date.now() };
  render();
  const { requestPatch } = await import('./micron-sysex.js');
  for (let b = 0; b < patchBanks; b++) {
    S.syncProgress.label = `Bank ${BANKS[b]}`;
    for (let s = 0; s < 128; s++) {
      for (let attempt = 0; attempt < 3; attempt++) {
        S._lastReqBank = b;
        S._lastReqSlot = s;
        requestPatch(b, s);
        const ok = await waitForSlot(b, s, 1000);
        if (ok) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 200));
      }
      S.syncProgress.done++;
      if (s % 8 === 0) render();
      await new Promise(r => setTimeout(r, 50));
    }
  }
  S.syncProgress.label = 'Patterns';
  requestAllPatterns();
  S.syncProgress.done++;
  render();
  await new Promise(r => setTimeout(r, 200));
  S.syncProgress.label = 'Rhythms';
  requestAllRhythms();
  S.syncProgress.done++;
  render();
}
