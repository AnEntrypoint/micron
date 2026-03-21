import { html } from './micron-ui-core.js';
import { S, addToLibrary, toggleFave, removeFromLibrary, saveState } from './micron-state.js';
import { PATCH_CATEGORIES, BANKS } from './micron-data.js';
import { defaultPatch, morphPatches, randomizePatch, sendAllParams, NRPN_MAP } from './micron-patch.js';
import { parsePatchDump, sendPatchDump } from './micron-sysex.js';

const CAT_ICONS = ['🕐','⭐','🎸','🎵','🌊','🎻','🎺','🎹','🥁','🔥','✨'];

let render = ()=>{};
export function setRender(fn) { render=fn; }
let _saveName = null;
let _importToast = null;
let _morphTimer = null;

if (!S.libraryMode) S.libraryMode = 'local';

export function renderLibraryTab() {
  const isSynth = S.libraryMode === 'synth';
  return html`<div>
    <div class=lib-toolbar>
      <div class=lib-mode-toggle>
        <button class=${'tbtn'+(S.libraryMode==='local'?' active':'')} onclick=${()=>{S.libraryMode='local';render();}}>Local Library</button>
        <button class=${'tbtn'+(S.libraryMode==='synth'?' active':'')} onclick=${()=>{S.libraryMode='synth';render();}}>Synth Banks</button>
      </div>
    </div>
    ${_importToast ? html`<div class=import-toast>${_importToast}</div>` : null}
    ${isSynth ? renderSynthBanks() : renderLocalLibrary()}
    ${!isSynth ? renderABSection() : null}
  </div>`;
}

function renderLocalLibrary() {
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
    <div class=lib-grid tabindex=0
      onkeydown=${e=>{
        const idx=S._libFocus??0;
        if(e.key==='ArrowRight'){e.preventDefault();S._libFocus=Math.min(items.length-1,idx+1);render();}
        else if(e.key==='ArrowLeft'){e.preventDefault();S._libFocus=Math.max(0,idx-1);render();}
        else if(e.key==='ArrowDown'){e.preventDefault();S._libFocus=Math.min(items.length-1,idx+4);render();}
        else if(e.key==='ArrowUp'){e.preventDefault();S._libFocus=Math.max(0,idx-4);render();}
        else if(e.key==='Enter'&&items[idx]){loadPatch(items[idx]);}
      }}
      onfocus=${()=>{if(S._libFocus===undefined)S._libFocus=0;}}
    >
      ${items.length===0?html`<div class=lib-empty>No patches. Save a patch or import from SysEx.</div>`:null}
      ${items.map((p,idx)=>html`<div class=${'lib-card'+(S.abPatch[0]?.id===p.id?' ab-a':'')+(S.abPatch[1]?.id===p.id?' ab-b':'')+(S._libFocus===idx?' lib-focus':'')} tabindex=-1>
        <div class=lc-name>${p.name}</div>
        <div class=lc-cat>${CAT_ICONS[p.category]||''} ${PATCH_CATEGORIES[p.category]||''}</div>
        <div class=lc-actions>
          <button class=tbtn onclick=${()=>loadPatch(p)} title="Load">Load</button>
          <button class="tbtn accent" onclick=${()=>editPatch(p)} title="Load and edit">Edit</button>
          <button class=${'tbtn'+(p.fave?' active':'')} onclick=${()=>{toggleFave(p.id);render();}} title="Favorite">★</button>
          <button class=tbtn onclick=${()=>setAB(0,p)} title="Set A">A</button>
          <button class=tbtn onclick=${()=>setAB(1,p)} title="Set B">B</button>
          <button class="tbtn warn" onclick=${()=>{removeFromLibrary(p.id);render();}} title="Delete">✕</button>
        </div>
      </div>`)}
    </div>
  </div>`;
}

function renderSynthBanks() {
  const banks = S.sysexBanks || [];
  const bank = banks[S.sysexSelectedBank] || [];
  const filter = S.sysexBankFilter || '';
  return html`<div>
    <div class=lib-toolbar style="flex-wrap:wrap;gap:4px">
      <div class=bank-selector>
        ${(typeof BANKS !== 'undefined' ? BANKS : ['Red','Green','Blue','Yellow']).map((b,i)=>html`<button
          class=${'tbtn'+(S.sysexSelectedBank===i?' active':'')}
          onclick=${()=>{S.sysexSelectedBank=i;render();}}
        >${b} (${(banks[i]||[]).filter(Boolean).length}/128)</button>`)}
      </div>
      <input placeholder="Search bank..." value=${filter} oninput=${e=>{S.sysexBankFilter=e.target.value;render();}} class=search-in style="margin-bottom:0" />
    </div>
    <div class=bank-grid style="max-height:400px">
      ${bank.map((p,i)=>{
        if (filter && p && !p.name.toLowerCase().includes(filter.toLowerCase())) return null;
        if (!p) return html`<div class=bank-cell title=${'Slot '+(i+1)}><span class=bc-num>${i+1}</span><span class=bc-name style="color:var(--text3)">—</span></div>`;
        return html`<div class='bank-cell loaded' title=${p.name}>
          <span class=bc-num>${i+1}</span>
          <span class=bc-name>${p.name}</span>
          <div class=bc-btns>
            <button class=tbtn style="font-size:9px;padding:2px 5px;min-height:22px" onclick=${e=>{e.stopPropagation();loadBankPatchLib(p,i);}}>Load</button>
            <button class="tbtn accent" style="font-size:9px;padding:2px 5px;min-height:22px" onclick=${e=>{e.stopPropagation();editBankPatchLib(p,i);}}>Edit</button>
          </div>
        </div>`;
      })}
    </div>
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
        clearTimeout(_morphTimer);
        _morphTimer=setTimeout(()=>{ sendAllParams(S.patch); }, 30);
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

function editPatch(p) {
  S.patch = {...defaultPatch(), ...p.patch};
  sendAllParams(S.patch);
  S.tab = 'patch';
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
      let i = 0, count = 0;
      while (i < data.length) {
        if (data[i] === 0xF0) {
          let end = data.indexOf(0xF7, i);
          if (end < 0) break;
          const msg = data.slice(i, end+1);
          const parsed = parsePatchDump(msg);
          if (parsed) {
            addToLibrary(parsed.name, parsed.params, parsed.params.category||0);
            const b = parsed.bank ?? 0, sl = parsed.slot ?? 0;
            if (!S.sysexBanks) S.sysexBanks = [Array(128).fill(null),Array(128).fill(null),Array(128).fill(null),Array(128).fill(null)];
            if (b >= 0 && b < 4 && sl >= 0 && sl < 128) S.sysexBanks[b][sl] = {name: parsed.name, params: parsed.params, raw: Array.from(msg)};
            count++;
          }
          i = end + 1;
        } else { i++; }
      }
      showToast(`Imported ${count} patch${count!==1?'es':''}`);
      render();
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

function showToast(msg) {
  _importToast = msg;
  render();
  setTimeout(() => { _importToast = null; render(); }, 3000);
}

function loadBankPatchLib(p, i) {
  let params = p.params;
  if (p.raw) {
    const parsed = parsePatchDump(new Uint8Array(p.raw));
    if (parsed) params = parsed.params;
    sendPatchDump(p.raw);
  } else {
    if (!params) return;
    sendAllParams({...defaultPatch(), ...params});
  }
  S.patch = {...defaultPatch(), ...(params || {})};
  render();
}

function editBankPatchLib(p, i) {
  loadBankPatchLib(p, i);
  S.tab = 'patch';
  render();
}

function exportLibrary() {
  const json = JSON.stringify(S.library, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'micron-library.json'; a.click();
  URL.revokeObjectURL(url);
}
