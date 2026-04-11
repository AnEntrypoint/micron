import { html } from './micron-ui-core.js';
import { S, pat, saveState } from './micron-state.js';
import { noteColor, stepFracLabel } from './micron-data.js';
import { renderQuickControls } from './micron-views-quickcontrols.js';
import { sendPatternSysEx, requestPattern } from './micron-sysex.js';

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
      </div>
      <div class=pr>
        <label>Slot</label>
        <input type=number min=0 max=255 value=${S.patSysexSlot??S.patIdx} oninput=${e=>{S.patSysexSlot=Math.max(0,Math.min(255,+e.target.value));}} class=num-in style="width:56px" />
        <button class=tbtn onclick=${()=>{sendCurrentPattern();S.sysexLog=`Sent pattern → slot ${S.patSysexSlot??S.patIdx}`;render();}}>▶ Send</button>
        <button class=tbtn onclick=${()=>{requestPattern(S.patSysexSlot??S.patIdx);S.sysexLog=`Capturing pattern slot ${S.patSysexSlot??S.patIdx}…`;render();}}>⟳ Capture</button>
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
    ${renderFromSynth()}
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
  const slot = (S.standaloneSlots && S.standaloneSlots['p'+S.patIdx]) ?? S.patSysexSlot ?? S.patIdx;
  sendPatternSysEx(pat(), slot);
}

let _chainDragIdx = null;
let _chainDragOver = null;

function renderSongChain() {
  return html`<div class=section>
    <h4>Pattern Chain</h4>
    <div class=chain-visual>
      ${S.songChain.length === 0
        ? html`<div class=chain-empty>No patterns in chain. Click pattern cards to add.</div>`
        : S.songChain.map((idx,i)=>html`<div
          class=${'chain-block'+(i===S.songPos?' cursor':'')+(i===_chainDragOver?' drag-over':'')}
          draggable=true
          ondragstart=${()=>{_chainDragIdx=i;}}
          ondragover=${e=>{e.preventDefault();_chainDragOver=i;render();}}
          ondragleave=${()=>{_chainDragOver=null;render();}}
          ondrop=${()=>{
            if(_chainDragIdx!==null&&_chainDragIdx!==i){
              const item=S.songChain.splice(_chainDragIdx,1)[0];
              S.songChain.splice(i,0,item);
              saveState();
            }
            _chainDragIdx=null;_chainDragOver=null;render();
          }}
          title=${'Pat '+(idx+1)+': '+S.patterns[idx]?.name}
        >
          <span class=chain-block-num>${idx+1}</span>
          <span class=chain-block-name>${S.patterns[idx]?.name||''}</span>
          <button class=chain-rm onclick=${e=>{e.stopPropagation();S.songChain.splice(i,1);saveState();render();}}>×</button>
        </div>`)
      }
    </div>
    <div class=chain-row style="margin-top:4px">
      <button class=tbtn onclick=${()=>addToChain()}>+ Add Current (Pat ${S.patIdx+1})</button>
      <button class="tbtn warn" onclick=${()=>{S.songChain=[];S.songPos=0;saveState();render();}}>Clear Chain</button>
    </div>
    <div class=pr style="margin-top:4px">
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

function renderFromSynth() {
  const entries = (S.sysexPatterns || []).map((p, i) => p ? {p, i} : null).filter(Boolean);
  if (entries.length === 0) return html`<div class=section>
    <h4>From Synth</h4>
    <div class=hint>No patterns received from synth yet. On Micron: [patterns] → select → push knob → "Send MIDI sysex?"</div>
  </div>`;
  const loaded = entries.filter(({i}) => S.patterns[i] && S.patterns[i].steps?.some(s=>s.notes?.length>0));
  const filter = S.synthPatFilter || '';
  const visible = entries.filter(({p}) => !filter || (p.name||'').toLowerCase().includes(filter.toLowerCase()));
  return html`<div class=section>
    <h4>From Synth (${entries.length})</h4>
    <input placeholder="Search synth patterns..." value=${filter} oninput=${e=>{S.synthPatFilter=e.target.value;render();}} class=search-in />
    <div class=synth-pat-grid>
      ${visible.map(({p, i}) => {
        const localPat = S.patterns[i];
        const hasNotes = localPat?.steps?.some(s=>s.notes?.length>0);
        const isActive = S.patIdx === i;
        return html`<div class=${'synth-pat-card'+(isActive?' active':'')} onclick=${()=>loadAndEditSynthPattern(i)}>
          <canvas class=pat-mini width=80 height=20 ref=${el=>{if(el&&hasNotes)drawPatMini(el,localPat);}}></canvas>
          <div class=synth-pat-name>${p.name || `Pattern ${i+1}`}</div>
          <div class=synth-pat-meta>${hasNotes?(localPat.steps.filter(s=>s.notes?.length>0).length+' notes • '+localPat.len+' steps'):'not loaded'}</div>
        </div>`;
      })}
    </div>
  </div>`;
}

function loadAndEditSynthPattern(i) {
  const p = S.sysexPatterns?.[i];
  if (!p) return;
  import('./micron-sysex.js').then(({parsePatternDump}) => {
    const parsed = parsePatternDump(new Uint8Array(p.raw));
    while (S.patterns.length <= i) S.patterns.push({name:`Pat ${S.patterns.length+1}`,len:16,grid:0.0625,type:'seq',steps:Array.from({length:64},()=>({notes:[],len:0.0625,prob:100}))});
    if (parsed) {
      S.patterns[i] = {name: p.name, len: parsed.len, grid: parsed.grid, type: parsed.type, steps: parsed.steps};
      const allPitches = parsed.steps.flatMap(s=>s.notes||[]).map(n=>n.pitch).filter(p=>p>0);
      if (allPitches.length) {
        const minP = Math.min(...allPitches);
        S.pitchOffset = Math.max(0, minP - 4);
      }
    } else {
      S.patterns[i] = {...S.patterns[i], name: p.name};
      S.patterns[i].steps.forEach(s => { s.notes = []; });
    }
    S.patIdx = i;
    S.tab = 'seq';
    saveState(); render();
  });
}

export function loadSynthPattern(i) { loadAndEditSynthPattern(i); }

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
