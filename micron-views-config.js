import { html } from './micron-ui-core.js';
import { S, saveState } from './micron-state.js';
import { sendAllSysEx } from './micron-sysex.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

const VEL_CURVES = ['linear-low','linear-med','linear-high','exp-low','exp-med','exp-high','log-low','log-med','log-high'];
const LOCAL_CTRL = ['on','off','off+send'];
const MIDI_MODES = ['single','multi'];
const MIDI_SYNC = ['off','ext','gen'];

function sendNRPN(msb, lsb, val) {
  import('./micron-midi.js').then(({midiOut}) => {
    const ch = (S.config.midiChannel - 1) & 0x0F;
    midiOut([0xB0|ch, 99, msb, 0xB0|ch, 98, lsb, 0xB0|ch, 6, (val>>7)&0x7F, 0xB0|ch, 38, val&0x7F]);
  });
}

function sendTuning(cents) {
  const v = cents + 200;
  sendNRPN(0x00, 0x10, v);
}

function sendTranspose(semi) {
  const v = semi + 12;
  sendNRPN(0x00, 0x11, v);
}

export function renderConfigTab() {
  const c = S.config;
  return html`<div>
    <div class=section>
      <h4>Global Configuration</h4>
      <p class=hint>These settings match the Micron's [config] mode. Master Tune and Transpose send NRPN immediately. Other settings are stored locally and shown for reference.</p>

      <div class=config-param>
        <label>Contrast</label>
        <input type=range min=0 max=15 value=${c.contrast} oninput=${e=>{c.contrast=+e.target.value;saveState();render();}} />
        <span class=pv>${c.contrast}</span>
      </div>

      <div class=config-param>
        <label>Master Tuning</label>
        <input type=range min=-200 max=200 value=${c.tuning} oninput=${e=>{c.tuning=+e.target.value;sendTuning(c.tuning);saveState();render();}} />
        <span class=pv>${c.tuning > 0 ? '+':''}${c.tuning} cents</span>
        <button class=tbtn onclick=${()=>{c.tuning=0;sendTuning(0);saveState();render();}}>Reset</button>
      </div>

      <div class=config-param>
        <label>Transpose</label>
        <input type=range min=-12 max=12 value=${c.transpose} oninput=${e=>{c.transpose=+e.target.value;sendTranspose(c.transpose);saveState();render();}} />
        <span class=pv>${c.transpose > 0 ? '+':''}${c.transpose} semitones</span>
        <button class=tbtn onclick=${()=>{c.transpose=0;sendTranspose(0);saveState();render();}}>Reset</button>
      </div>

      <div class=config-param>
        <label>Velocity Curve</label>
        <select onchange=${e=>{c.velocityCurveType=e.target.value;saveState();render();}}>
          ${VEL_CURVES.map(v=>html`<option value=${v} selected=${c.velocityCurveType===v}>${v}</option>`)}
        </select>
      </div>

      <div class=config-param>
        <label>Local Control</label>
        <select onchange=${e=>{c.localControl=e.target.value;saveState();render();}}>
          ${LOCAL_CTRL.map(v=>html`<option value=${v} selected=${c.localControl===v}>${v}</option>`)}
        </select>
        <span class=hint-inline>${c.localControl==='off+send'?'Sends pattern notes as MIDI':''}</span>
      </div>

      <div class=config-param>
        <label>MIDI Setup Mode</label>
        <select onchange=${e=>{c.midiSetupMode=e.target.value;saveState();render();}}>
          ${MIDI_MODES.map(v=>html`<option value=${v} selected=${c.midiSetupMode===v}>${v}-channel</option>`)}
        </select>
      </div>

      <div class=config-param>
        <label>MIDI Channel</label>
        <input type=number min=1 max=16 value=${c.midiChannel} oninput=${e=>{c.midiChannel=Math.max(1,Math.min(16,+e.target.value));saveState();}} class=num-in />
        <span class=hint-inline>${c.midiSetupMode==='multi'?'Parts use ch '+c.midiChannel+' onwards':''}</span>
      </div>

      <div class=config-param>
        <label>MIDI Sync</label>
        <select onchange=${e=>{c.midiSync=e.target.value;saveState();render();}}>
          ${MIDI_SYNC.map(v=>html`<option value=${v} selected=${c.midiSync===v}>${{off:'Off (internal)',ext:'Ext MIDI Sync',gen:'Generate MIDI Clock'}[v]}</option>`)}
        </select>
      </div>

      <div class=config-param>
        <label>Store Protect</label>
        <select onchange=${e=>{c.storeProtect=e.target.value==='on';saveState();render();}}>
          <option value=on selected=${c.storeProtect}>On (cannot save)</option>
          <option value=off selected=${!c.storeProtect}>Off (can save)</option>
        </select>
      </div>
    </div>

    <div class=section>
      <h4>SysEx Dump</h4>
      <p class=hint>Send all stored data (patches, patterns, rhythms, setups) from the Micron to this editor.</p>
      <div class=btn-group>
        <button class=tbtn onclick=${()=>{sendAllSysEx();S.sysexLog='Sent dump-all request';render();}}>Send All (Micron → Editor)</button>
      </div>
    </div>
  </div>`;
}
