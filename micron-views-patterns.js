import { html } from './micron-ui-core.js';
import { S, pat, saveState } from './micron-state.js';
import { noteColor, stepFracLabel } from './micron-data.js';
import { renderQuickControls } from './micron-views-quickcontrols.js';
import { sendPatternSysEx } from './micron-sysex.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

export function renderPatternsTab() {
  return html`<div>
    ${renderQuickControls(render)}
    <div class=section>
      <h4>Patterns</h4>
      <div class=pat-grid>
        ${S.patterns.map((p,i)=>html`<div class=${'pat-card'+(S.patIdx===i?' active':'')} onclick=${()=>{S.patIdx=i;render();}}>
          <div class=pname>${p.name}</div>
          <div class=plen>${p.len} steps • ${p.grid?stepFracLabel(p.grid):''} • ${p.type}</div>
          <canvas class=pat-mini width=80 height=24 ref=${el=>{if(el)drawPatMini(el,p);}}></canvas>
          <div class=pat-actions>
            <button class=tbtn onclick=${e=>{e.stopPropagation();copyPat(i);}}>Copy</button>
            <button class=tbtn onclick=${e=>{e.stopPropagation();pastePat(i);}}>Paste</button>
            <button class="tbtn warn" onclick=${e=>{e.stopPropagation();clearPat(i);}}>Clear</button>
          </div>
        </div>`)}
      </div>
    </div>
    <div class=section>
      <h4>Pattern Settings</h4>
      <div class=pr>
        <label>Name</label>
        <input type=text value=${pat().name} oninput=${e=>{pat().name=e.target.value;saveState();render();}} class=name-in />
        <button class=tbtn onclick=${()=>sendCurrentPattern()} title="Send to Micron">Send</button>
      </div>
      <div class=pr>
        <label>Length</label>
        <div class=slen-grid>
          ${[8,12,16,24,32,48,64].map(l=>html`<button class=${'slen-btn'+(pat().len===l?' active':'')} onclick=${()=>{changePatLen(l);render();}}>${l}</button>`)}
        </div>
      </div>
      <div class=pr>
        <label>Grid</label>
        <select onchange=${e=>{pat().grid=+e.target.value;render();}}>
          ${[0.03125,0.0625,0.125,0.25,0.5,1].map(v=>html`<option value=${v} selected=${pat().grid===v}>${stepFracLabel(v)}</option>`)}
        </select>
      </div>
      <div class=pr>
        <label>Type</label>
        <select onchange=${e=>{pat().type=e.target.value;render();}}>
          <option value=seq selected=${pat().type==='seq'}>Sequence</option>
          <option value=arp selected=${pat().type==='arp'}>Arpeggio</option>
        </select>
      </div>
    </div>
    ${renderSongChain()}
  </div>`;
}

function drawPatMini(canvas, p) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#08090d';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  if (!p.steps) return;
  const sw = canvas.width / Math.max(1, p.len||16);
  p.steps.slice(0,p.len||16).forEach((s,i)=>{
    if (!s.notes||!s.notes.length) return;
    ctx.fillStyle = noteColor(s.notes[0].pitch||60);
    ctx.fillRect(i*sw+1,2,sw-2,canvas.height-4);
  });
}

function changePatLen(l) {
  pat().len = l;
  while (pat().steps.length < l) pat().steps.push({notes:[],len:0.0625,prob:100});
  saveState();
}

let _clipPat = null;
function copyPat(i) { _clipPat = JSON.parse(JSON.stringify(S.patterns[i])); }
function pastePat(i) {
  if (!_clipPat) return;
  S.patterns[i] = JSON.parse(JSON.stringify(_clipPat));
  S.patterns[i].name = S.patterns[i].name + ' (copy)';
  saveState(); render();
}
function clearPat(i) {
  S.patterns[i].steps.forEach(s=>{s.notes=[];});
  saveState(); render();
}

function sendCurrentPattern() {
  const slot = (S.standaloneSlots && S.standaloneSlots['p'+S.patIdx]) ?? S.patIdx;
  sendPatternSysEx(pat(), slot);
}

function renderSongChain() {
  return html`<div class=section>
    <h4>Song Chain</h4>
    <div class=chain-row>
      ${S.songChain.map((idx,i)=>html`<span class=${'chain-slot filled'+(i===S.songPos?' cursor':'')} title=${'Pat '+(idx+1)}>
        ${idx+1}
        <button class=chain-rm onclick=${()=>{S.songChain.splice(i,1);saveState();render();}}>×</button>
      </span>`)}
      <button class=tbtn onclick=${()=>addToChain()}>+ Add</button>
      <button class="tbtn warn" onclick=${()=>{S.songChain=[];S.songPos=0;saveState();render();}}>Clear</button>
    </div>
    <div class=pr>
      <button class=tbtn onclick=${()=>exportPatternsJSON()}>Export Patterns JSON</button>
      <button class=tbtn onclick=${()=>importPatternsJSON()}>Import Patterns JSON</button>
    </div>
  </div>`;
}

function addToChain() {
  S.songChain.push(S.patIdx);
  saveState();
  render();
}

function exportPatternsJSON() {
  const json = JSON.stringify({patterns:S.patterns, songChain:S.songChain}, null, 2);
  const blob = new Blob([json],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='micron-patterns.json'; a.click();
  URL.revokeObjectURL(url);
}

function importPatternsJSON() {
  const input = document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange = e => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload = ev => {
      try {
        const d=JSON.parse(ev.target.result);
        if(d.patterns) S.patterns=d.patterns.map(p=>({...p,steps:p.steps.map(s=>({prob:100,...s}))}));
        if(d.songChain) S.songChain=d.songChain;
        saveState(); render();
      } catch(_) { alert('Invalid JSON file'); }
    };
    reader.readAsText(file);
  };
  input.click();
}
