import { createElement, applyDiff } from 'https://esm.sh/webjsx@0.0.73';
import htm from 'https://esm.sh/htm@3.1.1';
export const html = htm.bind(createElement);

let _renderFn = null;
let _pending = false;
export function setRenderFn(fn) { _renderFn = fn; }
export function render() {
  if (_pending) return;
  _pending = true;
  requestAnimationFrame(() => {
    _pending = false;
    if (_renderFn) _renderFn();
  });
}

export function makeCollapsible(key, title, content, color='cyan') {
  return { key, title, content, color };
}

export const TABS = [
  {id:'seq', label:'Sequencer', icon:'⊞'},
  {id:'patch', label:'Patch', icon:'◎'},
  {id:'patterns', label:'Patterns', icon:'▤'},
  {id:'perf', label:'Perform', icon:'♪'},
  {id:'midi', label:'MIDI', icon:'⟵'},
  {id:'sysex', label:'SysEx', icon:'⬡'},
  {id:'library', label:'Library', icon:'⊙'},
];
