import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { sp } from './micron-views-patch2.js';
import { ARP_MULTS, PORTAMENTO_TYPES, envMs, filterHz } from './micron-data.js';

export function renderQuickControls(renderFn) {
  const p = S.patch;
  const portOn = (p.portamento ?? 0) === 0;
  const arpOn = (p.arpMode ?? 0) !== 0;
  const cutoff = p.f1Cutoff ?? 512;
  const cutoffLabel = cutoff>=1023?'20kHz':filterHz(cutoff)<1000?filterHz(cutoff).toFixed(0)+'Hz':(filterHz(cutoff)/1000).toFixed(2)+'kHz';
  return html`<div class=quick-controls>
    <span class=qc-label>Quick</span>
    <span class=qc-sep></span>
    <label class=qc-item>
      <span>Vol</span>
      <input type=range min=0 max=100 value=${p.outputLevel??100} class=qc-slider oninput=${e=>{sp('outputLevel',+e.target.value);renderFn();}} />
      <span class=qc-val>${p.outputLevel??100}</span>
    </label>
    <span class=qc-sep></span>
    <label class=qc-item>
      <span>F1 Cut</span>
      <input type=range min=0 max=1023 value=${cutoff} class=qc-slider oninput=${e=>{sp('f1Cutoff',+e.target.value);renderFn();}} />
      <span class=qc-val>${cutoffLabel}</span>
    </label>
    <span class=qc-sep></span>
    <label class=qc-item>
      <span>Porta</span>
      <input type=checkbox checked=${portOn} onchange=${e=>{sp('portamento',e.target.checked?0:1);renderFn();}} />
    </label>
    ${portOn ? html`<label class=qc-item>
      <span>Time</span>
      <input type=range min=0 max=127 value=${p.portaTime??0} class=qc-slider oninput=${e=>{sp('portaTime',+e.target.value);renderFn();}} />
      <span class=qc-val>${envMs((p.portaTime??0)*0.07).toFixed(0)}ms</span>
    </label>` : null}
    <span class=qc-sep></span>
    <label class=qc-item>
      <span>Arp</span>
      <input type=checkbox checked=${arpOn} onchange=${e=>{sp('arpMode',e.target.checked?1:0);renderFn();}} />
    </label>
    ${arpOn ? html`<label class=qc-item>
      <span>Rate</span>
      <select class=qc-sel onchange=${e=>{sp('arpMult',+e.target.value);renderFn();}}>
        ${ARP_MULTS.map((m,i)=>html`<option value=${i} selected=${(p.arpMult??0)===i}>${m}</option>`)}
      </select>
    </label>` : null}
    <span class=qc-sep></span>
    <label class=qc-item>
      <span>Transpose</span>
      <input type=range min=-12 max=12 value=${p.globalTranspose??S.globalTranspose??0} class=qc-slider style="max-width:70px" oninput=${e=>{S.globalTranspose=+e.target.value;renderFn();}} />
      <span class=qc-val>${(p.globalTranspose??S.globalTranspose??0) > 0 ? '+' : ''}${p.globalTranspose??S.globalTranspose??0}</span>
    </label>
  </div>`;
}
