import { createElement, applyDiff } from 'https://esm.sh/webjsx@0.0.73';
import htm from 'https://esm.sh/htm@3.1.1';
const html = htm.bind(createElement);
import { S, loadState, saveState, pat } from './micron-state.js';
import { M, initMIDI, allNotesOff, logMidi, setClockSend } from './micron-midi.js';
import { handleSysEx as sysexHandler, renderSysExTab, setRender as sysexSetRender } from './micron-views-sysex.js';
import { renderPatchTab } from './micron-views-patch.js';
import { renderPatternsTab, setRender as patSetRender } from './micron-views-patterns.js';
import { renderMIDITab, setRender as midiSetRender } from './micron-views-midi.js';
import { renderLibraryTab, setRender as libSetRender } from './micron-views-library.js';
import { renderRhythmTab, setRender as rhythmSetRender } from './micron-views-rhythm.js';
import { renderConfigTab, setRender as configSetRender } from './micron-views-config.js';
import { renderStandaloneTab, setRender as standaloneSetRender } from './micron-views-standalone.js';
import { drawRoll, schedulePlayback, initRoll } from './micron-sequencer.js';
import { NOTE_NAMES, velColor } from './micron-data.js';
import { TABS, render as schedRender, setRenderFn } from './micron-ui-core.js';
let rollCanvas, velCanvas, audioCtx;

function handleMidiMsg(e) {
  if (!e.data) return;
  const d = e.data;
  if (d[0]===0xF0) { sysexHandler(d); logMidi('sx',d); return; }
  const st = d[0]&0xF0;
  if (M.thru && M.output) try { M.output.send(d); } catch(_) {}
  if (st===0x90&&d[2]>0) logMidi('nn',d);
  else if (st===0xB0) {
    logMidi('cc',d);
    const cc=d[1],val=d[2];
    if (S.midiLearnTarget!==null) { M.ccMap[cc]=S.midiLearnTarget; S.midiLearnTarget=null; }
    if (M.ccMap[cc]!==undefined) { const n=parseInt(M.ccMap[cc]); if(!isNaN(n)) import('./micron-midi.js').then(m=>m.sendNRPN(n,val)); }
    if (cc===1) M.modWheelVal=val;
  } else logMidi('?',d);
  schedRender();
}
window._midiHandler = handleMidiMsg;
function renderSeqTab() {
  const p = pat();
  return html`<div>
    <div class=roll-container style=${'height:'+S.rollH+'px'}>
      <canvas id=roll-canvas style="width:100%;height:100%;display:block" ref=${el=>{if(el&&el!==rollCanvas){rollCanvas=el;initRoll(rollCanvas,velCanvas);setupCanvas(el);}}}></canvas>
    </div>
    <div class=roll-resizer onmousedown=${startResize}></div>
    <canvas id=vel-canvas style="width:100%;height:38px;display:block;cursor:ns-resize" ref=${el=>{if(el&&el!==velCanvas){velCanvas=el;setupCanvas(el);}}}></canvas>
    <div class=seq-controls>
      ${[8,12,16,24,32,48,64].map(l=>html`<button class=${'slen-btn'+(p.len===l?' active':'')} onclick=${()=>{changeLen(l);}}>L${l}</button>`)}
      <span class=sep></span>
      <button class=${'tbtn'+(S.loop?' active':'')} onclick=${()=>{S.loop=!S.loop;schedRender();}}>↩</button>
      <button class=${'tbtn'+(S.metronome?' active':'')} onclick=${()=>{S.metronome=!S.metronome;schedRender();}}>♩</button>
      <span class=pos-display>${S.barBeat+1}/${p.len}</span>
      <span class=sep></span>
      <span>Swing:</span>
      <input type=range min=0 max=50 value=${S.swingAmt} oninput=${e=>{S.swingAmt=+e.target.value;schedRender();}} class=rs style="max-width:80px" />
      <span class=pv>${S.swingAmt}%</span>
      <button class=tbtn onclick=${()=>clearPat()}>Clear</button>
      ${S.unsaved?html`<span class=unsaved-ind>●</span>`:null}
    </div>
    ${renderStepGrid()}
  </div>`;
}

function renderStepGrid() {
  const p = pat();
  return html`<div class=step-grid>
    ${p.steps.slice(0,p.len).map((s,i)=>html`<div
      class=${'step'+(s.notes.length?' has-notes':'')+(i===S.cursor?' cursor':'')+(S.playing&&i===S.playStep%p.len?' playing':'')}
      onclick=${()=>{S.cursor=i;schedRender();}}
      oncontextmenu=${e=>{e.preventDefault();const pi=s.notes.findIndex(n=>true);if(pi>=0)s.notes.splice(pi,1);schedRender();}}>
      <span>${s.notes.length?NOTE_NAMES[s.notes[0].pitch%12]:'·'}</span>
      ${s.notes.length?html`<div class=vel-dot style=${'background:'+velColor(s.notes[0].vel)}></div>`:null}
    </div>`)}
  </div>`;
}

function setupCanvas(el) {
  const resize = () => { el.width=el.offsetWidth; el.height=el.offsetHeight; drawRoll(rollCanvas,velCanvas); };
  const ro = new ResizeObserver(resize);
  ro.observe(el); resize();
}

function changeLen(l) {
  pat().len=l;
  while(pat().steps.length<l) pat().steps.push({notes:[],len:S.stepLen,prob:100});
  schedRender();
}

function clearPat() { pat().steps.forEach(s=>{s.notes=[];}); S.unsaved=true; schedRender(); }

function togglePlay() {
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if (audioCtx.state==='suspended') audioCtx.resume();
  S.playing = !S.playing;
  if (S.playing) { S.playTime=audioCtx.currentTime; if(M.sendClock){import('./micron-midi.js').then(m=>m.startClock());} schedulePlayback(audioCtx); }
  else { cancelAnimationFrame(S.schedTimer); allNotesOff(); if(M.sendClock){import('./micron-midi.js').then(m=>m.stopClock());} }
  schedRender();
}

function startResize(e) {
  const startY=e.clientY,startH=S.rollH;
  const onMove=ev=>{S.rollH=Math.max(80,Math.min(500,startH+ev.clientY-startY));schedRender();};
  const up=()=>{document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',up);};
  document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',up);
}

function renderToolbar() {
  return html`<div id=toolbar>
    <span class=brand>ALESIS <span>MICRON</span></span>
    <span class=sep></span>
    <button class=tbtn onclick=${()=>{S.bpm=Math.max(20,S.bpm-1);setClockSend(M.sendClock,S.bpm);schedRender();}}>−</button>
    <input type=number class=bpm-in min=20 max=300 value=${S.bpm} oninput=${e=>{S.bpm=+e.target.value;setClockSend(M.sendClock,S.bpm);schedRender();}} />
    <button class=tbtn onclick=${()=>{S.bpm=Math.min(300,S.bpm+1);setClockSend(M.sendClock,S.bpm);schedRender();}}>+</button>
    <button class=${'tbtn'+(S.playing?' stop':' play')} onclick=${()=>togglePlay()}>${S.playing?'■ Stop':'▶ Play'}</button>
    <span class=sep></span>
    <span class=${'midi-dot'+(M.rxFlash?' rx':M.output?' ok':'')}></span>
    <span class=midi-name>${M.output?.name?.slice(0,14)||'No MIDI'}</span>
    <span class=sep></span>
    <button class=tbtn onclick=${()=>{S.theme=S.theme==='light'?'dark':'light';document.body.className=S.theme==='light'?'light':'';saveState();schedRender();}}>${S.theme==='light'?'Dark':'Light'}</button>
    <button class=tbtn onclick=${()=>saveState()}>Save</button>
    ${S.unsaved?html`<span class=unsaved-ind>●</span>`:null}
  </div>`;
}

function renderTabsBar() {
  return html`<div id=tabs-bar>
    ${TABS.map(t=>html`<button class=${'tab-btn'+(S.tab===t.id?' active':'')} onclick=${()=>{S.tab=t.id;schedRender();}}>${t.label}</button>`)}
  </div>`;
}

function renderBottomNav() {
  return html`<div id=bottom-nav>
    ${TABS.map(t=>html`<button class=${'bn-btn'+(S.tab===t.id?' active':'')} onclick=${()=>{S.tab=t.id;schedRender();}}>
      <span class=bn-icon>${t.icon}</span>
      <span>${t.label}</span>
    </button>`)}
  </div>`;
}

const TAB_VIEWS = {seq:renderSeqTab,patch:renderPatchTab,patterns:renderPatternsTab,rhythm:renderRhythmTab,midi:renderMIDITab,sysex:renderSysExTab,config:renderConfigTab,standalone:renderStandaloneTab,library:renderLibraryTab};

function doRender() {
  const view = TAB_VIEWS[S.tab] || renderSeqTab;
  const vnode = html`<div id=app>
    ${renderToolbar()}
    ${renderTabsBar()}
    <div id=panel>${view()}</div>
    ${renderBottomNav()}
  </div>`;
  applyDiff(document.getElementById('app'), vnode);
  if (S.tab==='seq') requestAnimationFrame(()=>drawRoll(rollCanvas,velCanvas));
}

window._micronRender = () => schedRender();
window._S = S;
window._M = M;
window._handleSysEx = sysexHandler;
window._requestPatch = (bank, slot) => import('./micron-sysex.js').then(m => m.requestPatch(bank, slot));
setRenderFn(doRender);
[sysexSetRender,patSetRender,midiSetRender,libSetRender,rhythmSetRender,configSetRender,standaloneSetRender].forEach(fn=>fn(schedRender));
document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  if (e.key===' ') { e.preventDefault(); togglePlay(); }
  if (e.key==='ArrowRight') { S.cursor=Math.min(pat().len-1,S.cursor+1); schedRender(); }
  if (e.key==='ArrowLeft') { S.cursor=Math.max(0,S.cursor-1); schedRender(); }
  if (e.key==='z'&&(e.ctrlKey||e.metaKey)) { import('./micron-state.js').then(m=>{const u=m.popUndo();if(u){S.patch=u;import('./micron-patch.js').then(p=>p.sendAllParams(S.patch));schedRender();}}); }
});

let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive:true});
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 60 && e.target.closest('#panel')) {
    const idx = TABS.findIndex(t=>t.id===S.tab);
    if (dx<0 && idx<TABS.length-1) S.tab=TABS[idx+1].id;
    if (dx>0 && idx>0) S.tab=TABS[idx-1].id;
    schedRender();
  }
}, {passive:true});

loadState();
const attachMidi = () => M.access?.inputs.forEach(i=>{ i.onmidimessage=handleMidiMsg; });
initMIDI(()=>{ attachMidi(); schedRender(); }).then(ok=>{ if(ok) attachMidi(); schedRender(); });
setInterval(()=>{ if(S.unsaved) saveState(); }, 30000);
doRender();
