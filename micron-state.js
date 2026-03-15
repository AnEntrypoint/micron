import { defaultPatch } from './micron-patch.js';

export const S = {
  midi: { channel:1 },
  tab: 'seq',
  bpm: 120,
  playing: false,
  recording: false,
  metronome: false,
  loop: true,
  cursor: 0,
  pitchOffset: 36,
  zoomX: 44,
  zoomY: 14,
  pending: [],
  patIdx: 0,
  patterns: Array.from({length:16}, (_,i) => ({
    name: `Pat ${i+1}`,
    len: 16,
    grid: 0.0625,
    type: 'seq',
    steps: Array.from({length:64}, () => ({notes:[], len:0.0625, prob:100}))
  })),
  chain: [],
  patch: defaultPatch(),
  playStep: 0,
  schedTimer: null,
  stepLen: 0.0625,
  octaveShift: 0,
  tapTimes: [],
  pressedKeys: new Set(),
  undoStack: [],
  unsaved: false,
  rollViewX: 0,
  rollH: 220,
  abPatch: [null, null],
  abSlot: 0,
  morphT: 0,
  midiLearnTarget: null,
  arpActive: false,
  arpHeld: [],
  arpStep: 0,
  arpVizStep: -1,
  chordMode: false,
  chordIntervals: [],
  scale: null,
  scaleRoot: 0,
  swingAmt: 0,
  backups: [],
  theme: 'dark',
  songChain: [],
  songPos: 0,
  nrpnSearch: '',
  patchTab: 'Voice',
  barBeat: 0,
  globalTranspose: 0,
  splitEnabled: false,
  splitNote: 60,
  splitCh1: 1,
  splitCh2: 2,
  layerEnabled: false,
  layerChannels: [1, 2],
  library: [],
  libraryFilter: '',
  libraryCat: -1,
  sysexBank: Array(128).fill(null),
  sysexBankFilter: '',
  sysexSelectedBank: 3,
  sysexSelectedSlot: 0,
  sysexLog: '',
  midiMonitor: [],
  lockedParams: {},
  velocityCurve: 'linear',
  shortcutsVisible: false,
  rollResizerDrag: false,
  paramSearch: '',
  collapsedSections: {},
  gamepadActive: false,
};

export const pat = () => S.patterns[S.patIdx];
export const step = i => pat().steps[i] ?? pat().steps[0];

export function saveState() {
  try {
    const d = {bpm:S.bpm,patterns:S.patterns,patIdx:S.patIdx,chain:S.chain,patch:S.patch,stepLen:S.stepLen,octaveShift:S.octaveShift,pitchOffset:S.pitchOffset,zoomX:S.zoomX,zoomY:S.zoomY,rollH:S.rollH,swingAmt:S.swingAmt,songChain:S.songChain,theme:S.theme,globalTranspose:S.globalTranspose,splitEnabled:S.splitEnabled,splitNote:S.splitNote,splitCh1:S.splitCh1,splitCh2:S.splitCh2,layerEnabled:S.layerEnabled,layerChannels:S.layerChannels,library:S.library,sysexBank:S.sysexBank,collapsedSections:S.collapsedSections,velocityCurve:S.velocityCurve};
    localStorage.setItem('micron_state', JSON.stringify(d));
    S.unsaved = false;
  } catch(_) {}
}

export function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem('micron_state')||'{}');
    if (d.bpm) S.bpm = d.bpm;
    if (d.patterns) S.patterns = d.patterns.map(p=>({...p,steps:p.steps.map(s=>({prob:100,...s}))}));
    if (d.patIdx!=null) S.patIdx = d.patIdx;
    if (d.chain) S.chain = d.chain;
    if (d.patch) S.patch = {...defaultPatch(),...d.patch};
    if (d.stepLen) S.stepLen = d.stepLen;
    if (d.octaveShift!=null) S.octaveShift = d.octaveShift;
    if (d.pitchOffset!=null) S.pitchOffset = d.pitchOffset;
    if (d.zoomX) S.zoomX = d.zoomX;
    if (d.zoomY) S.zoomY = d.zoomY;
    if (d.rollH) S.rollH = d.rollH;
    if (d.swingAmt!=null) S.swingAmt = d.swingAmt;
    if (d.songChain) S.songChain = d.songChain;
    if (d.theme) { S.theme = d.theme; document.body.className = d.theme==='light'?'light':''; }
    if (d.globalTranspose!=null) S.globalTranspose = d.globalTranspose;
    if (d.splitEnabled!=null) S.splitEnabled = d.splitEnabled;
    if (d.splitNote!=null) S.splitNote = d.splitNote;
    if (d.splitCh1) S.splitCh1 = d.splitCh1;
    if (d.splitCh2) S.splitCh2 = d.splitCh2;
    if (d.layerEnabled!=null) S.layerEnabled = d.layerEnabled;
    if (d.layerChannels) S.layerChannels = d.layerChannels;
    if (d.library) S.library = d.library;
    if (d.sysexBank) S.sysexBank = d.sysexBank;
    if (d.collapsedSections) S.collapsedSections = d.collapsedSections;
    if (d.velocityCurve) S.velocityCurve = d.velocityCurve;
  } catch(_) {}
}

export function pushUndo(patchSnapshot) {
  S.undoStack.push(JSON.parse(JSON.stringify(patchSnapshot)));
  if (S.undoStack.length > 20) S.undoStack.shift();
  S.unsaved = true;
}

export function popUndo() {
  if (!S.undoStack.length) return null;
  return S.undoStack.pop();
}

export function addToLibrary(name, patch, category=0) {
  S.library.unshift({id: Date.now(), name, patch: {...patch}, category, fave: false, created: new Date().toISOString()});
  if (S.library.length > 500) S.library.length = 500;
  saveState();
}

export function toggleFave(id) {
  const item = S.library.find(p=>p.id===id);
  if (item) { item.fave = !item.fave; saveState(); }
}

export function removeFromLibrary(id) {
  S.library = S.library.filter(p=>p.id!==id);
  saveState();
}
