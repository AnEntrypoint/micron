import { html } from './micron-ui-core.js';
import { S, rhythm, saveState, defaultRhythm } from './micron-state.js';
import { sendRhythmSysEx, requestRhythm } from './micron-sysex.js';
import { renderQuickControls } from './micron-views-quickcontrols.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

const DRUM_LETTERS = 'ABCDEFGHIJ';
const BAR_STEPS = {4:4, 8:8, 16:16, 32:32, 64:64};
const GRIDS = [0.0625, 0.125, 0.25, 0.5];
const GRID_LABELS = {0.0625:'1/16',0.125:'1/8',0.25:'1/4',0.5:'1/2'};

export function renderRhythmTab() {
  const r = rhythm();
  return html`<div>
    ${renderQuickControls(render)}
    ${renderVelPopover()}
    <div class=section>
      <h4>Rhythms</h4>
      <div class=rhythm-selector>
        <select onchange=${e=>{S.rhythmIdx=+e.target.value;render();}}>
          ${S.rhythms.map((rh,i)=>html`<option value=${i} selected=${S.rhythmIdx===i}>${rh.name}</option>`)}
        </select>
        <button class=tbtn onclick=${()=>newRhythm()}>New</button>
        <button class=tbtn onclick=${()=>copyRhythm()}>Copy</button>
        <button class="tbtn warn" onclick=${()=>clearRhythm()}>Clear</button>
        <button class="tbtn warn" onclick=${()=>deleteRhythm()}>Delete</button>
      </div>
    </div>
    <div class=section>
      <h4>Rhythm Settings</h4>
      <div class=pr>
        <label>Name</label>
        <input type=text value=${r.name} oninput=${e=>{r.name=e.target.value;saveState();render();}} class=name-in />
        <button class=tbtn onclick=${()=>sendCurrentRhythm()} title="Send to Micron">Send</button>
      </div>
      <div class=pr>
        <label>Length (steps)</label>
        <div class=slen-grid>
          ${Object.entries(BAR_STEPS).map(([k,v])=>html`<button class=${'slen-btn'+(r.len===v?' active':'')} onclick=${()=>setLen(v)}>${k}</button>`)}
        </div>
      </div>
      <div class=pr>
        <label>Grid</label>
        <select onchange=${e=>{r.grid=+e.target.value;saveState();render();}}>
          ${GRIDS.map(g=>html`<option value=${g} selected=${r.grid===g}>${GRID_LABELS[g]}</option>`)}
        </select>
      </div>
      <div class=pr>
        <label>Tempo</label>
        <input type=number min=20 max=300 value=${r.tempo||120} oninput=${e=>{r.tempo=+e.target.value;saveState();}} class=num-in />
        <span class=unit>BPM</span>
      </div>
    </div>
    <div class=section>
      <h4>Drums</h4>
      ${r.drums.map((drum,di)=>renderDrumRow(drum,di,r))}
      ${r.drums.length < 10 ? html`<button class=tbtn onclick=${()=>addDrum()}>+ Add Drum</button>` : null}
    </div>
    ${renderFromSynth()}
    <div class=section>
      <h4>SysEx</h4>
      <div class=btn-group>
        <button class=tbtn onclick=${()=>sendToMicron()}>Send to Micron</button>
        <button class=tbtn onclick=${()=>requestFromMicron()}>Request from Micron</button>
      </div>
      <div class=pr>
        <label>Slot</label>
        <input type=number min=0 max=127 value=${S.rhythmSysexSlot||0} oninput=${e=>{S.rhythmSysexSlot=+e.target.value;}} class=num-in />
      </div>
    </div>
  </div>`;
}

function sendCurrentRhythm() {
  const slot = (S.standaloneSlots && S.standaloneSlots['r'+S.rhythmIdx]) ?? S.rhythmSysexSlot ?? S.rhythmIdx;
  sendRhythmSysEx(rhythm(), slot);
}

function renderDrumRow(drum, di, r) {
  return html`<div class=drum-row>
    <div class=drum-header>
      <span class=drum-letter>Drum ${DRUM_LETTERS[di]}</span>
      <input type=text value=${drum.program} oninput=${e=>{drum.program=e.target.value;saveState();}} placeholder="Program name" class=drum-pgm />
      <label>Lvl</label>
      <input type=number min=0 max=100 value=${drum.level} oninput=${e=>{drum.level=+e.target.value;saveState();}} class=num-in style="width:48px" />
      <label>Pan</label>
      <input type=number min=-50 max=50 value=${drum.pan} oninput=${e=>{drum.pan=+e.target.value;saveState();}} class=num-in style="width:48px" />
      ${r.drums.length > 1 ? html`<button class="tbtn warn" onclick=${()=>removeDrum(di)}>×</button>` : null}
    </div>
    <div class=rhythm-grid>
      ${drum.steps.slice(0,r.len).map((s,si)=>{
        let _pressTimer;
        return html`<div
          class=${'rhythm-step'+(s.active?' active':'')+(si%4===0?' beat-start':'')}
          onclick=${()=>{s.active=!s.active;saveState();render();}}
          oncontextmenu=${e=>{e.preventDefault();editStepVel(drum,si);}}
          ontouchstart=${()=>{_pressTimer=setTimeout(()=>editStepVel(drum,si),500);}}
          ontouchend=${()=>clearTimeout(_pressTimer)}
          ontouchcancel=${()=>clearTimeout(_pressTimer)}
          title=${'Step '+(si+1)+' vel:'+s.vel}
          style=${s.active?`--vel-h:${Math.round(s.vel/127*100)}%`:''}
        ></div>`;
      })}
    </div>
  </div>`;
}

let _velEdit = null;

function editStepVel(drum, si) {
  _velEdit = { drum, si };
  render();
}

function renderVelPopover() {
  if (!_velEdit) return null;
  const { drum, si } = _velEdit;
  return html`<div class=vel-popover onclick=${e=>{if(e.target.className==='vel-popover'){_velEdit=null;render();}}}>
    <div class=vel-popover-box>
      <label>Step ${si+1} Velocity</label>
      <input type=range min=1 max=127 value=${drum.steps[si].vel} class=rs oninput=${e=>{drum.steps[si].vel=+e.target.value;render();}} />
      <span class=pv>${drum.steps[si].vel}</span>
      <div class=btn-group>
        <button class=tbtn onclick=${()=>{saveState();_velEdit=null;render();}}>OK</button>
        <button class=tbtn onclick=${()=>{_velEdit=null;render();}}>Cancel</button>
      </div>
    </div>
  </div>`;
}

function setLen(v) {
  const r = rhythm();
  r.len = v;
  r.drums.forEach(d => { while(d.steps.length < v) d.steps.push({active:false,vel:100}); });
  saveState(); render();
}

function addDrum() {
  rhythm().drums.push({program:'', level:100, pan:0, steps:Array.from({length:64},()=>({active:false,vel:100}))});
  saveState(); render();
}

function removeDrum(di) {
  rhythm().drums.splice(di, 1);
  saveState(); render();
}

function newRhythm() {
  S.rhythms.push(defaultRhythm());
  S.rhythmIdx = S.rhythms.length - 1;
  saveState(); render();
}

function copyRhythm() {
  const copy = JSON.parse(JSON.stringify(rhythm()));
  copy.name = copy.name + ' (copy)';
  S.rhythms.push(copy);
  S.rhythmIdx = S.rhythms.length - 1;
  saveState(); render();
}

function clearRhythm() {
  rhythm().drums.forEach(d => d.steps.forEach(s => { s.active=false; }));
  saveState(); render();
}

function deleteRhythm() {
  if (S.rhythms.length <= 1) return;
  S.rhythms.splice(S.rhythmIdx, 1);
  S.rhythmIdx = Math.min(S.rhythmIdx, S.rhythms.length - 1);
  saveState(); render();
}

function sendToMicron() {
  sendRhythmSysEx(rhythm(), S.rhythmSysexSlot || 0);
}

function requestFromMicron() {
  requestRhythm(S.rhythmSysexSlot || 0);
}

function renderFromSynth() {
  const entries = (S.sysexSetups || []).map((s, i) => s ? {s, i} : null).filter(Boolean);
  return html`<div class=section>
    <h4>From Synth</h4>
    ${entries.length === 0
      ? html`<div class=hint>No rhythms received from synth yet. On Micron: [rhythms] → select → push knob → "Send MIDI sysex?"</div>`
      : html`<div class=standalone-list>
          ${entries.map(({s, i}) => html`<div class=standalone-slot>
            <span class=slot-name>${s.name || `Setup ${i+1}`}</span>
            <span class=slot-info>slot ${i}</span>
            <button class=tbtn onclick=${() => loadSynthRhythm(i)}>Load</button>
          </div>`)}
        </div>`}
  </div>`;
}

function loadSynthRhythm(i) {
  const entry = S.sysexSetups?.[i];
  if (!entry) return;
  import('./micron-sysex.js').then(({parseRhythmDump}) => {
    const parsed = parseRhythmDump(new Uint8Array(entry.raw));
    while (S.rhythms.length <= i) S.rhythms.push(defaultRhythm());
    if (parsed) {
      S.rhythms[i] = {name: entry.name, len: parsed.len, grid: parsed.grid, drums: parsed.drums};
    } else {
      S.rhythms[i] = {...S.rhythms[i], name: entry.name};
    }
    S.rhythmIdx = i;
    saveState(); render();
  });
}
