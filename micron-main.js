import { createElement, applyDiff } from 'https://esm.sh/webjsx@0.0.73';
import htm from 'https://esm.sh/htm@3.1.1';
const html = htm.bind(createElement);
import { S, loadState, saveState, pat, step } from './micron-state.js';
import { M, initMIDI, midiOut, sendNoteOn, sendNoteOff, allNotesOff, logMidi, parseMidiMsg, setClockSend } from './micron-midi.js';
import { handleSysEx as sysexHandler, renderSysExTab, setRender as sysexSetRender } from './micron-views-sysex.js';
import { renderPatchTab } from './micron-views-patch.js';
import { renderPatternsTab, setRender as patSetRender } from './micron-views-patterns.js';
import { renderMIDITab, setRender as midiSetRender } from './micron-views-midi.js';
import { renderPerfTab, setRender as perfSetRender } from './micron-views-perf.js';
import { renderLibraryTab, setRender as libSetRender } from './micron-views-library.js';
import { renderRhythmTab, setRender as rhythmSetRender } from './micron-views-rhythm.js';
import { renderConfigTab, setRender as configSetRender } from './micron-views-config.js';
import { renderStandaloneTab, setRender as standaloneSetRender } from './micron-views-standalone.js';
import { drawRoll, schedulePlayback, initRoll } from './micron-sequencer.js';
import { initGamepad, playNote, releaseNote, tapTempo } from './micron-perf.js';
import { noteColor, isBlack, NOTE_NAMES, velColor, stepFracLabel } from './micron-data.js';
import { TABS, render as schedRender, setRenderFn } from './micron-ui-core.js';
const BASE_KEYS = {q:60,w:62,e:64,r:65,t:67,y:69,u:71,i:72,o:74,p:76,a:48,s:50,d:52,f:53,g:55,h:57,j:59,'2':61,'3':63,'5':66,'6':68,'7':70};
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
    <div class=seq-controls>
      <span class=brand>BPM</span>
      <input type=number class=bpm-in min=20 max=300 value=${S.bpm} oninput=${e=>{S.bpm=+e.target.value;setClockSend(M.sendClock,S.bpm);schedRender();}} />
      <button class=${'tbtn'+(S.playing?' stop':' play')} onclick=${()=>togglePlay()}>▶ ${S.playing?'Stop':'Play'}</button>
      <button class=${'tbtn rec'+(S.recording?' on':'')} onclick=${()=>{S.recording=!S.recording;schedRender();}}>⏺</button>
      <button class=${'tbtn'+(S.loop?' active':'')} onclick=${()=>{S.loop=!S.loop;schedRender();}}>↩</button>
      <button class=${'tbtn'+(S.metronome?' active':'')} onclick=${()=>{S.metronome=!S.metronome;schedRender();}}>♩</button>
      <button class="tbtn" onclick=${()=>{S.octaveShift=Math.max(-3,S.octaveShift-1);schedRender();}}>Oct▼</button>
      <span class=pos-display>Oct ${S.octaveShift>0?'+':''}${S.octaveShift}</span>
      <button class="tbtn" onclick=${()=>{S.octaveShift=Math.min(3,S.octaveShift+1);schedRender();}}>Oct▲</button>
      <span class=pos-display>${S.barBeat+1}/${p.len}</span>
      ${S.unsaved?html`<span class=unsaved-ind>●</span>`:null}
    </div>
    <div class=roll-container style=${'height:'+S.rollH+'px'}>
      <canvas id=roll-canvas style="width:100%;height:100%;display:block" ref=${el=>{if(el&&el!==rollCanvas){rollCanvas=el;initRoll(rollCanvas,velCanvas);setupCanvas(el);}}}></canvas>
    </div>
    <div class=roll-resizer onmousedown=${startResize}></div>
    <canvas id=vel-canvas style="width:100%;height:38px;display:block;cursor:ns-resize" ref=${el=>{if(el&&el!==velCanvas){velCanvas=el;setupCanvas(el);}}}></canvas>
    <div class=seq-controls>
      ${[8,12,16,24,32,48,64].map(l=>html`<button class=${'slen-btn'+(p.len===l?' active':'')} onclick=${()=>{changeLen(l);}}>L${l}</button>`)}
      <span class=sep></span>
      <span>Swing:</span>
      <input type=range min=0 max=50 value=${S.swingAmt} oninput=${e=>{S.swingAmt=+e.target.value;schedRender();}} class=rs style="max-width:80px" />
      <span class=pv>${S.swingAmt}%</span>
      <button class=tbtn onclick=${()=>clearPat()}>Clear</button>
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
    <span>BPM</span>
    <input type=number class=bpm-in min=20 max=300 value=${S.bpm} oninput=${e=>{S.bpm=+e.target.value;setClockSend(M.sendClock,S.bpm);schedRender();}} />
    <button class=${'tbtn'+(S.playing?' stop':' play')} onclick=${()=>togglePlay()}>${S.playing?'■ Stop':'▶ Play'}</button>
    <button class=${'tbtn'+(S.recording?' rec on':'rec')} onclick=${()=>{S.recording=!S.recording;schedRender();}}>⏺</button>
    <span class=sep></span>
    <button class=tbtn onclick=${()=>{S.octaveShift=Math.max(-3,S.octaveShift-1);schedRender();}}>Oct◀</button>
    <span class=pos-display>${S.octaveShift>0?'+':''}${S.octaveShift}</span>
    <button class=tbtn onclick=${()=>{S.octaveShift=Math.min(3,S.octaveShift+1);schedRender();}}>Oct▶</button>
    <span class=sep></span>
    <span class=${'midi-dot'+(M.rxFlash?' rx':M.output?' ok':'')}></span>
    <span style="font-size:9px;color:var(--text2)">${M.output?.name?.slice(0,12)||'No MIDI'}</span>
    <span class=sep></span>
    <button class=${'tbtn'+(S.theme==='light'?'':'')} onclick=${()=>{S.theme=S.theme==='light'?'dark':'light';document.body.className=S.theme==='light'?'light':'';saveState();schedRender();}}>☀</button>
    <button class=tbtn onclick=${()=>saveState()}>💾</button>
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

const TAB_VIEWS = {seq:renderSeqTab,patch:renderPatchTab,patterns:renderPatternsTab,rhythm:renderRhythmTab,midi:renderMIDITab,perf:renderPerfTab,sysex:renderSysExTab,config:renderConfigTab,standalone:renderStandaloneTab,library:renderLibraryTab};

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
setRenderFn(doRender);
[sysexSetRender,patSetRender,midiSetRender,perfSetRender,libSetRender,rhythmSetRender,configSetRender,standaloneSetRender].forEach(fn=>fn(schedRender));
document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  const note = BASE_KEYS[e.key];
  if (note && !S.pressedKeys.has(note+S.octaveShift*12)) playNote(note+S.octaveShift*12, 100);
  if (e.key===' ') { e.preventDefault(); togglePlay(); }
  if (e.key==='ArrowRight') { S.cursor=Math.min(pat().len-1,S.cursor+1); schedRender(); }
  if (e.key==='ArrowLeft') { S.cursor=Math.max(0,S.cursor-1); schedRender(); }
  if (e.key==='z'&&(e.ctrlKey||e.metaKey)) { import('./micron-state.js').then(m=>{const u=m.popUndo();if(u){S.patch=u;import('./micron-patch.js').then(p=>p.sendAllParams(S.patch));schedRender();}}); }
});
document.addEventListener('keyup', e => {
  const note = BASE_KEYS[e.key];
  if (note) releaseNote(note+S.octaveShift*12);
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
initGamepad(schedRender);
setInterval(()=>{ if(S.unsaved) saveState(); }, 30000);
doRender();
