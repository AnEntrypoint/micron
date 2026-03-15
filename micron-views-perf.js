import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { M, sendCC, sendPitchBend } from './micron-midi.js';
import { playNote, releaseNote, tapTempo, getPadNotes, startArp, stopArp } from './micron-perf.js';
import { SCALES, CHORD_PRESETS, NOTE_NAMES, isBlack } from './micron-data.js';

let render = ()=>{};
export function setRender(fn) { render=fn; }

export function renderPerfTab() {
  return html`<div>
    <div class=perf-top>
      ${renderTransposeSection()}
      ${renderSplitLayerSection()}
    </div>
    ${renderPads()}
    ${renderKeyboard()}
    <div class=perf-bottom>
      ${renderXYPad()}
      ${renderArpSection()}
      ${renderChordScale()}
    </div>
  </div>`;
}

function renderTransposeSection() {
  return html`<div class=section>
    <h4>Transpose & Octave</h4>
    <div class=pr>
      <label>Global Transpose</label>
      <button class=tbtn onclick=${()=>{S.globalTranspose--;render();}}>-</button>
      <span class=pv>${S.globalTranspose>0?'+':''}${S.globalTranspose} st</span>
      <button class=tbtn onclick=${()=>{S.globalTranspose++;render();}}>+</button>
    </div>
    <div class=pr>
      <label>Octave</label>
      <button class=tbtn onclick=${()=>{S.octaveShift=Math.max(-3,S.octaveShift-1);render();}}>▼</button>
      <span class=pv>Oct ${S.octaveShift>0?'+':''}${S.octaveShift}</span>
      <button class=tbtn onclick=${()=>{S.octaveShift=Math.min(3,S.octaveShift+1);render();}}>▲</button>
    </div>
  </div>`;
}

function renderSplitLayerSection() {
  return html`<div class=section>
    <h4>Split & Layer</h4>
    <div class=pr>
      <label>Split</label>
      <input type=checkbox checked=${S.splitEnabled} onchange=${e=>{S.splitEnabled=e.target.checked;render();}} />
      <span>at ${NOTE_NAMES[S.splitNote%12]}${Math.floor(S.splitNote/12)-1}</span>
    </div>
    ${S.splitEnabled?html`<div>
      <div class=pr><label>Split Note</label><input type=range min=0 max=127 value=${S.splitNote} oninput=${e=>{S.splitNote=+e.target.value;render();}} class=rs /></div>
      <div class=pr><label>Low Ch</label><select onchange=${e=>{S.splitCh1=+e.target.value;render();}}>${Array.from({length:16},(_,i)=>html`<option value=${i+1} selected=${S.splitCh1===i+1}>CH${i+1}</option>`)}</select></div>
      <div class=pr><label>High Ch</label><select onchange=${e=>{S.splitCh2=+e.target.value;render();}}>${Array.from({length:16},(_,i)=>html`<option value=${i+1} selected=${S.splitCh2===i+1}>CH${i+1}</option>`)}</select></div>
    </div>`:null}
    <div class=pr>
      <label>Layer</label>
      <input type=checkbox checked=${S.layerEnabled} onchange=${e=>{S.layerEnabled=e.target.checked;render();}} />
    </div>
    ${S.layerEnabled?html`<div class=pr>
      <label>Layer Ch</label>
      <select onchange=${e=>{S.layerChannels=[M.channel,+e.target.value];render();}}>${Array.from({length:16},(_,i)=>html`<option value=${i+1} selected=${S.layerChannels[1]===i+1}>CH${i+1}</option>`)}</select>
    </div>`:null}
  </div>`;
}

function renderPads() {
  const padNotes = getPadNotes();
  return html`<div class=perf-pads>
    ${padNotes.map((note,i)=>html`<div class=${'perf-pad'+(S.pressedKeys.has(note)?' active':'')}
      onmousedown=${()=>{playNote(note,100);render();}}
      onmouseup=${()=>{releaseNote(note);render();}}
      onmouseleave=${()=>{if(S.pressedKeys.has(note)){releaseNote(note);render();}}}
      ontouchstart=${e=>{e.preventDefault();playNote(note,Math.round((e.touches[0].force||0.7)*127));render();}}
      ontouchend=${e=>{e.preventDefault();releaseNote(note);render();}}>
      <span>${NOTE_NAMES[note%12]}${Math.floor(note/12)-1}</span>
    </div>`)}
  </div>`;
}

function renderKeyboard() {
  const startNote = 48 + S.octaveShift*12;
  const keys = Array.from({length:25},(_,i)=>startNote+i);
  return html`<div class=kb-wrap>
    <div class=midi-kb>
      ${keys.map(note=>html`<div class=${'midi-key '+(isBlack(note)?'black':'white')+(S.pressedKeys.has(note)?' on':'')}
        style=${'left:'+(getKeyX(note-startNote))+'px;width:'+(isBlack(note)?10:14)+'px;height:'+(isBlack(note)?28:44)+'px'}
        onmousedown=${()=>{playNote(note,100);render();}}
        onmouseup=${()=>{releaseNote(note);render();}}
        onmouseleave=${()=>{if(S.pressedKeys.has(note)){releaseNote(note);render();}}}
        ontouchstart=${e=>{e.preventDefault();playNote(note,Math.round((e.touches[0].force||0.7)*127));render();}}
        ontouchend=${e=>{e.preventDefault();releaseNote(note);render();}}>
      </div>`)}
    </div>
  </div>`;
}

function getKeyX(i) {
  const whites = [0,0,1,1,2,3,3,4,4,5,5,6];
  const offsets = [0,8,14,22,28,42,50,56,64,70,78,84];
  return offsets[i%12] + Math.floor(i/12)*98;
}

function renderXYPad() {
  return html`<div class=section>
    <h4>XY Pad</h4>
    <div class=xy-wrap>
      <div class=xy-pad id=xy-pad
        onmousedown=${e=>startXY(e)}
        onmousemove=${e=>{if(e.buttons)moveXY(e);}}
        ontouchstart=${e=>{e.preventDefault();startXY(e.touches[0]);}}
        ontouchmove=${e=>{e.preventDefault();moveXY(e.touches[0]);}}
        style="position:relative;touch-action:none">
        <div class=xy-thumb id=xy-thumb style=${'left:'+(M.pbVal/127*100)+'%;top:'+((1-M.modWheelVal/127)*100)+'%;transform:translate(-50%,-50%)'}></div>
      </div>
      <div class=xy-labels>
        <span>X=CC74: ${M.pbVal}</span>
        <span>Y=CC1: ${M.modWheelVal}</span>
      </div>
    </div>
  </div>`;
}

function startXY(e) { moveXY(e); }
function moveXY(e) {
  const pad = document.getElementById('xy-pad');
  if (!pad) return;
  const r = pad.getBoundingClientRect();
  const x = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
  const y = Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
  M.pbVal = Math.round(x*127);
  M.modWheelVal = Math.round((1-y)*127);
  sendCC(74, M.pbVal);
  sendCC(1, M.modWheelVal);
  render();
}

function renderArpSection() {
  return html`<div class=section>
    <h4>Arpeggiator</h4>
    <div class=pr>
      <label>Active</label>
      <input type=checkbox checked=${S.arpActive} onchange=${e=>{S.arpActive=e.target.checked;if(S.arpActive)startArp(render);else stopArp();render();}} />
    </div>
    <div class=pr>
      <label>Tap Tempo</label>
      <button class=tbtn onclick=${()=>tapTempo(render)}>Tap (${S.bpm} BPM)</button>
    </div>
  </div>`;
}

function renderChordScale() {
  return html`<div class=section>
    <h4>Chord & Scale</h4>
    <div class=pr>
      <label>Chord</label>
      <select onchange=${e=>{const k=e.target.value;S.chordIntervals=CHORD_PRESETS[k]||[];S.chordMode=S.chordIntervals.length>0;render();}}>
        ${Object.keys(CHORD_PRESETS).map(k=>html`<option value=${k}>${k}</option>`)}
      </select>
    </div>
    <div class=pr>
      <label>Scale</label>
      <select onchange=${e=>{S.scale=e.target.value==='Chromatic'?null:e.target.value;render();}}>
        ${Object.keys(SCALES).map(k=>html`<option value=${k} selected=${(S.scale||'Chromatic')===k}>${k}</option>`)}
      </select>
    </div>
    ${S.scale?html`<div class=pr>
      <label>Root</label>
      <select onchange=${e=>{S.scaleRoot=+e.target.value;render();}}>
        ${NOTE_NAMES.map((n,i)=>html`<option value=${i} selected=${S.scaleRoot===i}>${n}</option>`)}
      </select>
    </div>`:null}
  </div>`;
}
