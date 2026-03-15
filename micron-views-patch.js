import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { ARP_PATTERNS,ARP_ORDERS,ARP_MULTS,ARP_MODES,ARP_SPANS,TEMPO_SYNC_RATES,ENV_SLOPES,ENV_LOOPS,ENV_RESETS,PORTAMENTO_TYPES,PORTAMENTO_MODES,PITCH_BEND_MODES,UNISON_VOICES,PATCH_CATEGORIES,NOISE_TYPES,WAVE_NAMES,OCT_LABELS,SEMI_LABELS,envMs,lfoHz } from './micron-data.js';
import { sp, pRow, pSel, sec, filterTab, fxTab, modTab, trackTab } from './micron-views-patch2.js';

const PATCH_TABS = ['Voice','OSC','Mix','Filter','Env','LFO','FX','Mod','Track','Output'];

function voiceTab() {
  return html`<div>
    ${sec('Voice','cyan',
      pRow('Polyphony','polyMode',0,1,1,v=>v?'poly':'mono'),
      pSel('Unison','unison',['on','off']),
      pSel('Unison Voices','unisonVoices',UNISON_VOICES),
      pRow('Unison Detune','unisonDetune',0,100),
      pSel('Portamento','portamento',['on','off']),
      pSel('Porta Type','portaType',PORTAMENTO_TYPES),
      pRow('Porta Time','portaTime',0,127,1,v=>envMs(v*0.07).toFixed(0)+'ms'),
      pSel('Porta Mode','portaMode',PORTAMENTO_MODES),
      pSel('PB Mode','pitchBendMode',PITCH_BEND_MODES),
      pRow('Analog Drift','analogDrift',0,100),
      pSel('Category','category',PATCH_CATEGORIES)
    )}
    ${sec('Arpeggiator','orange',
      pSel('Mode','arpMode',ARP_MODES),
      pSel('Pattern','arpPattern',ARP_PATTERNS),
      pSel('Multiplier','arpMult',ARP_MULTS),
      pRow('Length','arpLength',0,14,1,v=>v+2),
      pRow('Oct Range','arpOctRange',0,4),
      pSel('Span','arpSpan',ARP_SPANS),
      pSel('Note Order','arpOrder',ARP_ORDERS),
      pRow('Tempo','arpTempo',500,2500,1,v=>(v/10).toFixed(1)+' BPM')
    )}
  </div>`;
}

function oscTab() {
  return html`<div class=grid3>
    ${[1,2,3].map(o=>html`<div class="osc-col">
      <h4>OSC ${o}</h4>
      ${pSel('Wave',`osc${o}Wave`,WAVE_NAMES)}
      ${pRow('Shape',`osc${o}Shape`,0,100)}
      ${pSel('Octave',`osc${o}Oct`,OCT_LABELS)}
      ${pSel('Semitone',`osc${o}Semi`,SEMI_LABELS)}
      ${pRow('Fine',`osc${o}Fine`,-999,999,1,v=>(v/10).toFixed(1)+'%')}
      ${pRow('PB Range',`osc${o}PBRange`,0,12)}
    </div>`)}
  </div>`;
}

function mixTab() {
  return html`<div>
    ${sec('Levels','cyan',
      ...['osc1','osc2','osc3','ring','extIn','noise'].map(s=>pRow(s+' Level',`${s}Level`,0,100))
    )}
    ${sec('Balance','orange',
      ...['osc1','osc2','osc3','ring','noise','extIn'].map(s=>pRow(s+' Bal',`${s}Bal`,-50,50)),
      pSel('Noise Type','noiseType',NOISE_TYPES),
      pRow('F1→F2 Level','f1ToF2',0,100)
    )}
  </div>`;
}

function envTab() {
  return html`<div class=grid3>
    ${[['e1','Amp'],['e2','Filter'],['e3','Pitch/Mod']].map(([e,lbl])=>html`<div class="env-col">
      <h4>${lbl} Env</h4>
      ${pRow('Attack',`${e}AtkTime`,0,255,1,v=>envMs(v).toFixed(0)+'ms')}
      ${pSel('Atk Slope',`${e}AtkSlope`,ENV_SLOPES)}
      ${pRow('Decay',`${e}DecTime`,0,255,1,v=>envMs(v).toFixed(0)+'ms')}
      ${pSel('Dec Slope',`${e}DecSlope`,ENV_SLOPES)}
      ${pRow('Sustain',`${e}SusLevel`,e==='e1'?0:-100,100)}
      ${pRow('Release',`${e}RelTime`,0,256,1,v=>v>=256?'held':envMs(v).toFixed(0)+'ms')}
      ${pSel('Rel Slope',`${e}RelSlope`,ENV_SLOPES)}
      ${pRow('Velocity',`${e}Vel`,0,100)}
      ${pSel('Loop',`${e}Loop`,ENV_LOOPS)}
      ${pSel('Reset',`${e}Reset`,ENV_RESETS)}
      <div class=pr><label>Freerun</label><input type=checkbox checked=${!!S.patch[`${e}Freerun`]} onchange=${ev=>{sp(`${e}Freerun`,ev.target.checked?1:0);window._micronRender?.();}} /></div>
      <div class=pr><label>Sus Pedal</label><input type=checkbox checked=${!!S.patch[`${e}Pedal`]} onchange=${ev=>{sp(`${e}Pedal`,ev.target.checked?1:0);window._micronRender?.();}} /></div>
    </div>`)}
  </div>`;
}

function lfoTab() {
  return html`<div>
    ${[1,2].map(n=>sec(`LFO ${n}`,n===1?'cyan':'orange',
      pRow('Rate',`lfo${n}Rate`,0,1023,1,v=>v>=1023?'1kHz':lfoHz(v).toFixed(3)+'Hz'),
      pSel('Tempo Sync',`lfo${n}Sync`,['on','off']),
      pSel('Sync Rate',`lfo${n}SyncRate`,TEMPO_SYNC_RATES),
      pSel('Reset',`lfo${n}Reset`,ENV_RESETS),
      pRow('M1 Slider',`lfo${n}M1`,0,100)
    ))}
    ${sec('Sample & Hold','cyan',
      pRow('Rate','shRate',0,1023,1,v=>lfoHz(v).toFixed(3)+'Hz'),
      pSel('Tempo Sync','shSync',['on','off']),
      pSel('Sync Rate','shSyncRate',TEMPO_SYNC_RATES),
      pSel('Reset','shReset',ENV_RESETS),
      pRow('Smoothing','shSmooth',0,100)
    )}
  </div>`;
}

function outputTab() {
  return html`<div>
    ${sec('Output','cyan',
      pRow('Output Level','outputLevel',0,100),
      html`<div class=pr><label>Patch Name</label><input type=text value=${S.patch.patchName||''} maxlength=14 class=name-in oninput=${e=>{S.patch.patchName=e.target.value;S.unsaved=true;window._micronRender?.();}} /></div>`
    )}
    ${sec('Knob Assignments','cyan',
      pRow('Knob X','knobX',0,161),
      pRow('Knob Y','knobY',0,161),
      pRow('Knob Z','knobZ',0,161)
    )}
  </div>`;
}

const TAB_RENDERERS = {Voice:voiceTab,OSC:oscTab,Mix:mixTab,Filter:filterTab,Env:envTab,LFO:lfoTab,FX:fxTab,Mod:modTab,Track:trackTab,Output:outputTab};

export function renderPatchTab() {
  return html`<div>
    <div class=ptabs>${PATCH_TABS.map(t=>html`<button class=${'tbtn'+(S.patchTab===t?' active':'')} onclick=${()=>{S.patchTab=t;window._micronRender?.();}}>${t}</button>`)}</div>
    <input placeholder="Search params..." value=${S.paramSearch||''} oninput=${e=>{S.paramSearch=e.target.value;window._micronRender?.();}} class="search-in psearch" />
    ${(TAB_RENDERERS[S.patchTab]||voiceTab)()}
  </div>`;
}
