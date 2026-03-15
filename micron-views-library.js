import { html } from './micron-ui-core.js';
import { S, addToLibrary, toggleFave, removeFromLibrary, saveState } from './micron-state.js';
import { PATCH_CATEGORIES } from './micron-data.js';
import { defaultPatch, morphPatches, randomizePatch, sendAllParams, NRPN_MAP } from './micron-patch.js';
import { parsePatchDump } from './micron-sysex.js';

const CAT_ICONS = ['🕐','⭐','🎸','🎵','🌊','🎻','🎺','🎹','🥁','🔥','✨'];

let render = ()=>{};
export function setRender(fn) { render=fn; }
let _saveName = null;

export function renderLibraryTab() {
  const items = S.library.filter(p=>{
    const matchName = !S.libraryFilter || p.name.toLowerCase().includes(S.libraryFilter.toLowerCase());
    const matchCat = S.libraryCat<0 || p.category===S.libraryCat;
    return matchName && matchCat;
  });

  return html`<div>
    <div class=lib-toolbar>
      <input placeholder="Search patches..." value=${S.libraryFilter} oninput=${e=>{S.libraryFilter=e.target.value;render();}} class=search-in />
      ${_saveName === null
        ? html`<button class=tbtn onclick=${()=>{_saveName=S.patch.patchName||'New Patch';render();}}>Save Current Patch</button>`
        : html`<input class=name-in value=${_saveName} oninput=${e=>{_saveName=e.target.value;}} placeholder="Patch name" autofocus />
               <button class=tbtn onclick=${()=>{if(_saveName){addToLibrary(_saveName,S.patch,S.patch.category||0);}_saveName=null;render();}}>Save</button>
               <button class=tbtn onclick=${()=>{_saveName=null;render();}}>Cancel</button>`}
      <button class=tbtn onclick=${()=>importSysexToLibrary()}>Import SysEx</button>
      <button class=tbtn onclick=${()=>exportLibrary()}>Export JSON</button>
    </div>
    <div class=lib-cats>
      <button class=${'cat-btn'+(S.libraryCat<0?' active':'')} onclick=${()=>{S.libraryCat=-1;render();}}>All</button>
      ${PATCH_CATEGORIES.map((c,i)=>html`<button class=${'cat-btn'+(S.libraryCat===i?' active':'')} onclick=${()=>{S.libraryCat=i;render();}}>${CAT_ICONS[i]} ${c}</button>`)}
    </div>
    <div class=lib-grid>
      ${items.length===0?html`<div class=lib-empty>No patches. Save a patch or import from SysEx.</div>`:null}
      ${items.map(p=>html`<div class=${'lib-card'+(S.abPatch[0]?.id===p.id?' ab-a':'')+(S.abPatch[1]?.id===p.id?' ab-b':'')}>
        <div class=lc-name>${p.name}</div>
        <div class=lc-cat>${CAT_ICONS[p.category]||''} ${PATCH_CATEGORIES[p.category]||''}</div>
        <div class=lc-actions>
          <button class=tbtn onclick=${()=>loadPatch(p)} title="Load">Load</button>
          <button class=${'tbtn'+(p.fave?' active':'')} onclick=${()=>{toggleFave(p.id);render();}} title="Favorite">★</button>
          <button class=tbtn onclick=${()=>setAB(0,p)} title="Set A">A</button>
          <button class=tbtn onclick=${()=>setAB(1,p)} title="Set B">B</button>
          <button class="tbtn warn" onclick=${()=>{removeFromLibrary(p.id);render();}} title="Delete">✕</button>
        </div>
      </div>`)}
    </div>
    ${renderABSection()}
  </div>`;
}

function renderABSection() {
  const hasAB = S.abPatch[0] && S.abPatch[1];
  return html`<div class=ab-section>
    <h4 class=sh>A/B Compare & Morph</h4>
    <div class=ab-slots>
      <div class=${'ab-slot'+(S.abSlot===0?' active':'')} onclick=${()=>{if(S.abPatch[0]){S.abSlot=0;loadPatch(S.abPatch[0]);render();}}}>
        <span class=ab-label>A</span>
        <span>${S.abPatch[0]?.name||'—'}</span>
      </div>
      <div class=${'ab-slot'+(S.abSlot===1?' active':'')} onclick=${()=>{if(S.abPatch[1]){S.abSlot=1;loadPatch(S.abPatch[1]);render();}}}>
        <span class=ab-label>B</span>
        <span>${S.abPatch[1]?.name||'—'}</span>
      </div>
    </div>
    ${hasAB?html`<div class=morph-row>
      <label>Morph A→B</label>
      <input type=range min=0 max=100 value=${Math.round(S.morphT*100)} oninput=${e=>{
        S.morphT=e.target.value/100;
        const morphed=morphPatches(S.abPatch[0].patch,S.abPatch[1].patch,S.morphT);
        S.patch={...morphed};
        sendAllParams(S.patch);
        render();
      }} class=rs />
      <span class=pv>${Math.round(S.morphT*100)}%</span>
    </div>`:null}
    <div class=rand-section>
      <h4 class=sh>Randomizer</h4>
      <button class=tbtn onclick=${()=>doRandomize()}>Randomize Unlocked Params</button>
      <button class=tbtn onclick=${()=>{S.lockedParams={};render();}}>Unlock All</button>
      <button class=tbtn onclick=${()=>{Object.keys(NRPN_MAP).forEach(k=>S.lockedParams[k]=true);render();}}>Lock All</button>
      <div class=lock-grid>
        ${['osc1Wave','osc2Wave','f1Type','f2Type','f1Cutoff','f1Res','e1AtkTime','e1DecTime','e1SusLevel','e1RelTime','lfo1Rate','lfo2Rate'].map(k=>html`<label class=lock-item><input type=checkbox checked=${!!S.lockedParams[k]} onchange=${e=>{S.lockedParams[k]=e.target.checked;render();}} />${k}</label>`)}
      </div>
    </div>
  </div>`;
}

function loadPatch(p) {
  S.patch = {...defaultPatch(), ...p.patch};
  sendAllParams(S.patch);
  render();
}

function setAB(slot, p) {
  S.abPatch[slot] = p;
  render();
}

function saveCurrentPatch() {
  _saveName = S.patch.patchName || 'New Patch';
  render();
}

function doRandomize() {
  const randomized = randomizePatch(S.patch, S.lockedParams);
  S.patch = randomized;
  sendAllParams(S.patch);
  S.unsaved = true;
  render();
}

function importSysexToLibrary() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.syx,.mid,.bin';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = new Uint8Array(ev.target.result);
      let i = 0;
      while (i < data.length) {
        if (data[i] === 0xF0) {
          let end = data.indexOf(0xF7, i);
          if (end < 0) break;
          const msg = data.slice(i, end+1);
          const parsed = parsePatchDump(msg);
          if (parsed) addToLibrary(parsed.name, parsed.params, parsed.params.category||0);
          i = end + 1;
        } else { i++; }
      }
      render();
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

function exportLibrary() {
  const json = JSON.stringify(S.library, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'micron-library.json'; a.click();
  URL.revokeObjectURL(url);
}
