import { html } from './micron-ui-core.js';
import { S, saveState } from './micron-state.js';
import { sendPatternSysEx, sendRhythmSysEx, requestPattern, requestRhythm, requestAllPatterns, requestAllRhythms, requestBank } from './micron-sysex.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

function ensureState() {
  if (!S.standaloneSlots) S.standaloneSlots = {};
  if (S.sendProgress === undefined) S.sendProgress = null;
}

export function renderStandaloneTab() {
  ensureState();
  return html`<div>
    <div class=section>
      <h4>Standalone Programming Workflow</h4>
      <p class=hint>Assign slot numbers, then send everything to the Micron in one operation. The Micron stores programs, patterns, and rhythms in numbered slots. Press Send Everything to upload all items.</p>
      ${S.sendProgress !== null ? html`<div class=send-progress>
        <div class=progress-bar style=${'width:'+Math.round(S.sendProgress.done/S.sendProgress.total*100)+'%'}></div>
        <span>${S.sendProgress.done} / ${S.sendProgress.total} sent</span>
        ${S.sendProgress.done >= S.sendProgress.total ? html`<span class=ok> Done!</span>` : null}
      </div>` : null}
      <div class=btn-group>
        <button class=${'tbtn'+(S.sendProgress&&S.sendProgress.done<S.sendProgress.total?' disabled':'')} onclick=${()=>sendEverything()}>Send Everything to Micron</button>
        <button class=tbtn onclick=${()=>requestEverything()}>Request All from Micron</button>
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
      <h4>Patches (SysEx Bank)</h4>
      <div class=standalone-list>
        ${S.sysexBank.map((p,i)=>p?html`<div class=standalone-slot>
          <span class=slot-name>${p.name}</span>
          <span class=slot-info>Slot ${i}</span>
          <label>Send to</label>
          <input type=number min=0 max=127 value=${getSlot('patch',i)||i} oninput=${e=>setSlot('patch',i,+e.target.value)} class=num-in style="width:52px" />
        </div>`:null)}
      </div>
      <button class=tbtn onclick=${()=>requestBank(3)}>Request User Bank from Micron</button>
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

function requestEverything() {
  requestAllPatterns();
  setTimeout(() => requestAllRhythms(), 200);
  setTimeout(() => requestBank(3), 400);
}
