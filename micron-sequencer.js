import { S, pat, step, saveState } from './micron-state.js';
import { sendNoteOn, sendNoteOff, M } from './micron-midi.js';
import { noteColor, velColor, isBlack, NOTE_NAMES, stepFracLabel } from './micron-data.js';

const VEL_H = 38, RULER_H = 18;
const STEP_LENS = [0.03125,0.0625,0.125,0.25,0.5,1,1.5,2,3,4];

export function initRoll(canvas, velCanvas) {
  let drag = null;
  canvas.addEventListener('mousedown', e => startDrag(e, canvas, velCanvas));
  canvas.addEventListener('mousemove', e => { if(drag) moveDrag(e, canvas, velCanvas); });
  canvas.addEventListener('mouseup', () => { drag=null; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0], canvas, velCanvas); }, {passive:false});
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if(drag) moveDrag(e.touches[0], canvas, velCanvas); }, {passive:false});
  canvas.addEventListener('touchend', () => { drag=null; });
  if (velCanvas) {
    velCanvas.addEventListener('mousedown', e => editVel(e, velCanvas));
    velCanvas.addEventListener('mousemove', e => { if(e.buttons) editVel(e, velCanvas); });
  }
}

function getNoteFromY(y, h) {
  const rows = Math.floor((h - RULER_H) / S.zoomY);
  const row = Math.floor((y - RULER_H) / S.zoomY);
  return S.pitchOffset + rows - 1 - row;
}
function getStepFromX(x, w) {
  const len = pat().len;
  const stepW = (w - 44) / len;
  return Math.floor((x - S.rollViewX) / stepW);
}

function startDrag(e, canvas, velCanvas) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const si = getStepFromX(x, canvas.width);
  const pitch = getNoteFromY(y, canvas.height);
  if (si < 0 || si >= pat().len || y < RULER_H) return;
  const s = step(si);
  const existing = s.notes.findIndex(n=>n.pitch===pitch);
  if (existing >= 0) { s.notes.splice(existing,1); }
  else { s.notes.push({pitch, vel:100, len:S.stepLen}); }
  S.unsaved = true;
  drawRoll(canvas, velCanvas);
}
function moveDrag(e, canvas, velCanvas) { startDrag(e, canvas, velCanvas); }

function editVel(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const si = Math.floor(x / (canvas.width / pat().len));
  if (si < 0 || si >= pat().len) return;
  const s = step(si);
  const vel = Math.max(1, Math.min(127, Math.round((1 - (e.clientY - rect.top) / canvas.height) * 127)));
  s.notes.forEach(n => n.vel = vel);
  S.unsaved = true;
}

export function drawRoll(canvas, velCanvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const len = pat().len;
  const stepW = (W - 44) / len;
  const rows = Math.floor((H - RULER_H) / S.zoomY);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#08090d';
  ctx.fillRect(0,0,W,H);
  for (let r=0; r<rows; r++) {
    const pitch = S.pitchOffset + rows - 1 - r;
    const y = RULER_H + r * S.zoomY;
    ctx.fillStyle = isBlack(pitch) ? '#0a0c14' : '#0d0f18';
    ctx.fillRect(44, y, W-44, S.zoomY-1);
    if (pitch % 12 === 0) { ctx.fillStyle='#1c1f2e'; ctx.fillRect(44,y,W-44,1); }
    ctx.fillStyle = '#3a3f54'; ctx.font = '8px monospace';
    if (pitch % 12 === 0) ctx.fillText(`C${Math.floor(pitch/12)-1}`,2,y+S.zoomY-2);
  }
  for (let i=0; i<len; i++) {
    const x = 44 + i * stepW;
    ctx.fillStyle = i%4===0 ? '#1c1f2e' : '#12141c';
    ctx.fillRect(x+1, RULER_H, stepW-2, H-RULER_H);
    if (i === S.playStep % len && S.playing) { ctx.fillStyle='#00e5ff18'; ctx.fillRect(x,RULER_H,stepW,H-RULER_H); }
    ctx.fillStyle = '#3a3f54'; ctx.font = '8px monospace';
    if (i%4===0) ctx.fillText(i+1, x+2, RULER_H-4);
  }
  for (let i=0; i<len; i++) {
    const s = step(i);
    s.notes.forEach(n => {
      const r = rows - 1 - (n.pitch - S.pitchOffset);
      if (r < 0 || r >= rows) return;
      const x = 44 + i * stepW + 1;
      const y = RULER_H + r * S.zoomY + 1;
      const nw = Math.max(4, (n.len / (S.stepLen||0.0625)) * stepW - 2);
      ctx.fillStyle = noteColor(n.pitch);
      ctx.fillRect(x, y, Math.min(nw, W-x-2), S.zoomY-2);
    });
  }
  if (velCanvas) drawVel(velCanvas);
}

function drawVel(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const len = pat().len;
  const sw = W / len;
  ctx.fillStyle = '#08090d'; ctx.fillRect(0,0,W,H);
  for (let i=0; i<len; i++) {
    const s = step(i);
    if (!s.notes.length) continue;
    const vel = s.notes[0].vel;
    const bh = Math.max(2, (vel/127)*H);
    ctx.fillStyle = velColor(vel);
    ctx.fillRect(i*sw+1, H-bh, sw-2, bh);
  }
}

let _rollRef = null, _velRef = null;
export function setPlaybackCanvases(roll, vel) { _rollRef = roll; _velRef = vel; }

export function schedulePlayback(audioCtx) {
  if (!S.playing) return;
  const now = audioCtx.currentTime;
  const beatsPerStep = (pat().grid || S.stepLen) * 4;
  const secPerBeat = 60 / S.bpm;
  const swing = S.swingAmt / 100;
  while (S.playTime < now + 0.1) {
    const si = S.playStep % pat().len;
    const s = step(si);
    if (Math.random()*100 < (s.prob??100)) {
      const swingOffset = (si%2===1) ? swing * secPerBeat * 0.5 : 0;
      const t = S.playTime + swingOffset;
      const msFromNow = Math.max(0, (t - now) * 1000);
      s.notes.forEach(n => {
        const pitch = n.pitch + S.globalTranspose;
        const durMs = Math.max(50, n.len * 4 * secPerBeat * 1000 * 0.9);
        setTimeout(() => { sendNoteOn(pitch, n.vel, undefined); setTimeout(() => sendNoteOff(pitch), durMs); }, msFromNow);
      });
      if (S.metronome && si%4===0) playClick(audioCtx, t);
    }
    S.playStep++;
    S.playTime += beatsPerStep * secPerBeat;
    S.barBeat = si;
  }
  if (_rollRef) drawRoll(_rollRef, _velRef);
  S.schedTimer = requestAnimationFrame(() => schedulePlayback(audioCtx));
}

function playClick(ctx, t) {
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.frequency.value = 880; g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.05);
  osc.start(t); osc.stop(t+0.05);
}

export function buildStepGrid(render) {
  return pat().steps.slice(0, pat().len).map((s, i) => {
    const active = i === S.cursor;
    const playing = S.playing && i === S.playStep % pat().len;
    return {i, s, active, playing};
  });
}
