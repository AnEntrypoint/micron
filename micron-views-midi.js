import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { M, allNotesOff, previewNote, sendNRPN, setClockSend } from './micron-midi.js';
import { NRPN_MAP } from './micron-patch.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

export function renderMIDITab() {
  return html`<div>
    <div class=grid2>
      <div class=section>
        <h4>Devices</h4>
        <div class=pr>
          <label>Output</label>
          <select onchange=${e=>{M.output=M.outputs.find(o=>o.id===e.target.value)||M.output;}}>
            <option value="">${M.outputs.length?'Select...':'No MIDI outputs'}</option>
            ${M.outputs.map(o=>html`<option value=${o.id} selected=${M.output?.id===o.id}>${o.name}</option>`)}
          </select>
        </div>
        <div class=pr>
          <label>Input</label>
          <select onchange=${e=>{ const inp=M.inputs.find(i=>i.id===e.target.value); if(inp){inp.onmidimessage=window._midiHandler; M.input=inp;} }}>
            <option value="">${M.inputs.length?'Select...':'No MIDI inputs'}</option>
            ${M.inputs.map(i=>html`<option value=${i.id} selected=${M.input?.id===i.id}>${i.name}</option>`)}
          </select>
        </div>
        <div class=pr>
          <label>Channel</label>
          <select onchange=${e=>{M.channel=+e.target.value;S.midi.channel=M.channel;render();}}>
            ${Array.from({length:16},(_,i)=>html`<option value=${i+1} selected=${M.channel===i+1}>CH ${i+1}</option>`)}
          </select>
        </div>
        <div class=pr>
          <label>MIDI Thru</label>
          <input type=checkbox checked=${M.thru} onchange=${e=>{M.thru=e.target.checked;render();}} />
        </div>
        <div class=pr>
          <label>Send Clock</label>
          <input type=checkbox checked=${M.sendClock} onchange=${e=>{setClockSend(e.target.checked, S.bpm);render();}} />
        </div>
        <div class=pr>
          <label>Velocity Curve</label>
          <select onchange=${e=>{M.velocityCurve=e.target.value;render();}}>
            ${['linear','soft','hard'].map(c=>html`<option value=${c} selected=${M.velocityCurve===c}>${c}</option>`)}
          </select>
        </div>
      </div>
      <div class=section>
        <h4>Actions</h4>
        <div class=btn-group>
          <button class="tbtn warn" onclick=${()=>{allNotesOff();render();}}>PANIC (All Notes Off)</button>
          <button class=tbtn onclick=${()=>previewNote(60)}>Test Note (C4)</button>
        </div>
        <h4 style="margin-top:8px">Send NRPN</h4>
        <div class=pr>
          <label>NRPN #</label>
          <input type=number min=0 max=16383 value=${S.nrpnNum||0} oninput=${e=>{S.nrpnNum=+e.target.value;}} class=num-in />
        </div>
        <div class=pr>
          <label>Value</label>
          <input type=number min=-8192 max=8191 value=${S.nrpnVal||0} oninput=${e=>{S.nrpnVal=+e.target.value;}} class=num-in />
        </div>
        <button class=tbtn onclick=${()=>sendNRPN(S.nrpnNum||0, S.nrpnVal||0)}>Send</button>
      </div>
    </div>
    ${renderLearnSection()}
    ${renderMonitor()}
  </div>`;
}

function renderLearnSection() {
  const entries = Object.entries(M.ccMap);
  return html`<div class=section>
    <h4>MIDI Learn (CC → NRPN)</h4>
    <div class=learn-row>
      ${S.midiLearnTarget!==null
        ? html`<span class=learn-active>Waiting for CC... (move a controller)</span><button class=tbtn onclick=${()=>{S.midiLearnTarget=null;render();}}>Cancel</button>`
        : html`<div class=pr>
          <label>Param</label>
          <select id=learn-param>
            ${Object.keys(NRPN_MAP).map(k=>html`<option value=${NRPN_MAP[k].n}>${k}</option>`)}
          </select>
          <button class=tbtn onclick=${()=>{const sel=document.getElementById('learn-param'); S.midiLearnTarget=sel?sel.value:null;render();}}>Learn CC</button>
        </div>`}
    </div>
    ${entries.length?html`<table class=mod-table>
      <thead><tr><th>CC</th><th>NRPN</th><th></th></tr></thead>
      <tbody>${entries.map(([cc,nrpn])=>html`<tr>
        <td>#${cc}</td><td>${nrpn}</td>
        <td><button class=tbtn onclick=${()=>{delete M.ccMap[cc];render();}}>✕</button></td>
      </tr>`)}</tbody>
    </table>`:null}
  </div>`;
}

function renderMonitor() {
  return html`<div class=section>
    <h4>MIDI Monitor <span class=${'midi-dot'+(M.rxFlash?' rx':' ok')}></span></h4>
    <div class=midi-monitor>
      ${S.midiMonitor.slice(0,32).map(m=>html`<div class=${'mm-row mm-'+m.type}>
        <span class=mm-t>${new Date(m.t).toLocaleTimeString('en',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
        <span class=mm-msg>${m.msg}</span>
      </div>`)}
    </div>
    <button class=tbtn onclick=${()=>{S.midiMonitor=[];render();}}>Clear</button>
  </div>`;
}
