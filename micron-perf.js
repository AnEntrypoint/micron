import { S } from './micron-state.js';
import { sendNoteOn, sendNoteOff, M } from './micron-midi.js';
import { SCALES, CHORD_PRESETS, NOTE_NAMES } from './micron-data.js';

const PAD_NOTES = [60,62,64,65,67,69,71,72,48,50,52,53,55,57,59,36];
let gpFrame = null;
let padVelocities = {};
let touchStartTimes = {};

export function applyScaleAndChord(pitch) {
  let p = pitch + S.globalTranspose;
  if (S.scale) {
    const root = S.scaleRoot;
    const scale = SCALES[S.scale];
    if (scale) {
      const oct = Math.floor((p - root) / 12);
      const pos = ((p - root) % 12 + 12) % 12;
      const nearest = scale.reduce((a,b) => Math.abs(b-pos)<Math.abs(a-pos)?b:a);
      p = root + oct*12 + nearest;
    }
  }
  return p;
}

export function playNote(pitch, vel=100) {
  const ch = channelForNote(pitch);
  const base = applyScaleAndChord(pitch);
  sendNoteOn(base, vel, ch);
  S.pressedKeys.add(base);
  if (S.chordMode) {
    S.chordIntervals.forEach(interval => {
      const cp = base + interval;
      if (cp>=0&&cp<128) { sendNoteOn(cp, vel, ch); S.pressedKeys.add(cp); }
    });
  }
  if (S.arpActive) { S.arpHeld.push(base); }
}

export function releaseNote(pitch) {
  const ch = channelForNote(pitch);
  const base = applyScaleAndChord(pitch);
  sendNoteOff(base, ch);
  S.pressedKeys.delete(base);
  if (S.chordMode) {
    S.chordIntervals.forEach(interval => {
      const cp = base + interval;
      sendNoteOff(cp, ch);
      S.pressedKeys.delete(cp);
    });
  }
  if (S.arpActive) {
    const idx = S.arpHeld.indexOf(base);
    if (idx>=0) S.arpHeld.splice(idx,1);
  }
}

function channelForNote(pitch) {
  if (S.splitEnabled) return pitch < S.splitNote ? S.splitCh1 : S.splitCh2;
  return M.channel;
}

export function layerNote(pitch, vel) {
  if (!S.layerEnabled) return;
  S.layerChannels.forEach(ch => { if(ch!==M.channel) sendNoteOn(pitch+S.globalTranspose, vel, ch); });
}

export function initGamepad(render) {
  window.addEventListener('gamepadconnected', () => { S.gamepadActive=true; startGP(render); });
  window.addEventListener('gamepaddisconnected', () => { S.gamepadActive=false; stopGP(); });
}

function startGP(render) {
  function gpLoop() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...gps].find(g=>g);
    if (gp) {
      gp.buttons.forEach((btn, i) => {
        const note = PAD_NOTES[i%16];
        if (btn.pressed && !S.gpPrev?.[i]) { playNote(note, Math.round(btn.value*127)||100); }
        else if (!btn.pressed && S.gpPrev?.[i]) { releaseNote(note); }
      });
      S.gpPrev = gp.buttons.map(b=>b.pressed);
    }
    gpFrame = requestAnimationFrame(gpLoop);
  }
  gpFrame = requestAnimationFrame(gpLoop);
}
function stopGP() { if (gpFrame) cancelAnimationFrame(gpFrame); }

let arpTimer = null;
export function startArp(render) {
  if (arpTimer) clearInterval(arpTimer);
  const secPerStep = 60 / S.bpm / (S.patch.arpRate??8);
  arpTimer = setInterval(() => {
    if (!S.arpActive || !S.arpHeld.length) return;
    S.arpVizStep = (S.arpVizStep+1) % S.arpHeld.length;
    const note = S.arpHeld[S.arpVizStep % S.arpHeld.length];
    sendNoteOn(note, 100);
    setTimeout(() => sendNoteOff(note), secPerStep*900);
    render();
  }, secPerStep*1000);
}
export function stopArp() { if (arpTimer) clearInterval(arpTimer); arpTimer=null; }

export function getPadNotes() { return PAD_NOTES; }

export function tapTempo(render) {
  const now = Date.now();
  S.tapTimes.push(now);
  if (S.tapTimes.length > 8) S.tapTimes.shift();
  const recent = S.tapTimes.filter(t => now - t < 3000);
  if (recent.length >= 2) {
    const diffs = recent.slice(1).map((t,i)=>t-recent[i]);
    const avg = diffs.reduce((a,b)=>a+b)/diffs.length;
    S.bpm = Math.max(40, Math.min(300, Math.round(60000/avg)));
    render();
  }
}
