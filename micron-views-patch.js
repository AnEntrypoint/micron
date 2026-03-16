import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { ARP_PATTERNS,ARP_ORDERS,ARP_MULTS,ARP_MODES,ARP_SPANS,TEMPO_SYNC_RATES,ENV_SLOPES,ENV_LOOPS,ENV_RESETS,PORTAMENTO_TYPES,PORTAMENTO_MODES,PITCH_BEND_MODES,UNISON_VOICES,PATCH_CATEGORIES,NOISE_TYPES,WAVE_NAMES,OCT_LABELS,SEMI_LABELS,envMs,lfoHz } from './micron-data.js';
import { sp, pRow, pSel, sec, filterTab, fxTab, modTab, trackTab } from './micron-views-patch2.js';
import { NRPN_MAP, defaultPatch, sendParam } from './micron-patch.js';

const PATCH_TABS = ['Voice','OSC','Mix','Filter','Env','LFO','FX','Mod','Track','Output'];

function adsrSvg(atk, dec, sus, rel) {
  const W=160, H=36, pad=4;
  const w=W-pad*2, h=H-pad*2;
  const ta=Math.min(atk/255,1), td=Math.min(dec/255,1), ts=Math.max(0,Math.min((sus+100)/200,1)), tr=Math.min(rel/256,1);
  const segW=w/4;
  const x0=pad, x1=pad+segW*ta*0.9+4, x2=x1+segW*td*0.9+4, x3=x2+segW*0.4, x4=pad+w;
  const yTop=pad, yBot=pad+h, ySus=pad+h*(1-ts);
  const pts=`${x0},${yBot} ${x1},${yTop} ${x2},${ySus} ${x3},${ySus} ${x4},${yBot}`;
  return html`<svg width=${W} height=${H} style="display:block;margin-bottom:4px;opacity:0.6">
    <polyline points=${pts} fill="none" stroke="#ff6b00" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1=${x2} y1=${ySus} x2=${x3} y2=${ySus} stroke="#ff6b00" stroke-width="1" stroke-dasharray="2,2"/>
  </svg>`;
}

function lfoWaveSvg(rate, idx) {
  const W=80, H=28, N=64;
  const shapes=['sine','tri','saw','sq'];
  const shape=shapes[idx%4];
  const pts=Array.from({length:N},(_,i)=>{
    const t=i/(N-1), x=t*W;
    if(shape==='sine') return `${x},${H/2-Math.sin(t*Math.PI*4)*H*0.4}`;
    if(shape==='tri') return `${x},${H/2-(Math.abs((t*4%2)-1)*2-1)*H*0.4}`;
    if(shape==='saw') return `${x},${H/2-(t*4%1-0.5)*H*0.8}`;
    return `${x},${H/2-(((t*4%1)<0.5)?1:-1)*H*0.4}`;
  }).join(' ');
  return html`<svg width=${W} height=${H} style="display:inline-block;vertical-align:middle;opacity:0.6;margin-left:4px">
    <polyline points=${pts} fill="none" stroke="#00e5ff" stroke-width="1.2"/>
  </svg>`;
}

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
      ${adsrSvg(S.patch[`${e}AtkTime`]??10,S.patch[`${e}DecTime`]??80,S.patch[`${e}SusLevel`]??70,S.patch[`${e}RelTime`]??80)}
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
      html`<div style="margin-bottom:4px">${lfoWaveSvg(S.patch[`lfo${n}Rate`]??200, n-1)}</div>`,
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
      html`<div class=pr>
        <label>Patch Name <span class=no-nrpn title="No NRPN — requires SysEx to send to synth">no NRPN</span></label>
        <input type=text value=${S.patch.patchName||''} maxlength=14 class=name-in oninput=${e=>{S.patch.patchName=e.target.value;S.unsaved=true;window._micronRender?.();}} />
      </div>`
    )}
    ${sec('Knob Assignments','cyan',
      html`<p class=hint style="margin:0 0 6px">Knob assignments are stored locally only — no confirmed NRPN to send live changes.</p>`,
      pRow('Knob X','knobX',0,161),
      pRow('Knob Y','knobY',0,161),
      pRow('Knob Z','knobZ',0,161)
    )}
  </div>`;
}

const TAB_RENDERERS = {Voice:voiceTab,OSC:oscTab,Mix:mixTab,Filter:filterTab,Env:envTab,LFO:lfoTab,FX:fxTab,Mod:modTab,Track:trackTab,Output:outputTab};

const PARAM_TAB_MAP = {
  Voice:['polyMode','unison','unisonVoices','unisonDetune','portamento','portaType','portaTime','portaMode','pitchBendMode','analogDrift','category','arpMode','arpPattern','arpMult','arpLength','arpOctRange','arpSpan','arpOrder','arpTempo'],
  OSC:['osc1Wave','osc1Shape','osc1Oct','osc1Semi','osc1Fine','osc1PBRange','osc2Wave','osc2Shape','osc2Oct','osc2Semi','osc2Fine','osc2PBRange','osc3Wave','osc3Shape','osc3Oct','osc3Semi','osc3Fine','osc3PBRange'],
  Mix:['osc1Level','osc2Level','osc3Level','ringLevel','extInLevel','noiseLevel','osc1Bal','osc2Bal','osc3Bal','ringBal','noiseBal','extInBal','noiseType','f1ToF2'],
  Filter:['f1Type','f1Cutoff','f1Res','f1EnvAmt','f1Keytrk','f1Polarity','f1Level','f1Pan','f2Type','f2Cutoff','f2Res','f2EnvAmt','f2Keytrk','f2OffsetType','f2OffsetFreq','f2Level','f2Pan','unfiltLevel','unfiltSrc','unfiltPan'],
  Env:['e1AtkTime','e1AtkSlope','e1DecTime','e1DecSlope','e1SusLevel','e1RelTime','e1RelSlope','e1Vel','e1Loop','e1Reset','e1Freerun','e1Pedal','e2AtkTime','e2DecTime','e2SusLevel','e2RelTime','e2Vel','e3AtkTime','e3DecTime','e3SusLevel','e3RelTime','e3Vel'],
  LFO:['lfo1Rate','lfo1Sync','lfo1SyncRate','lfo1Reset','lfo1M1','lfo2Rate','lfo2Sync','lfo2SyncRate','lfo2Reset','lfo2M1','shRate','shSync','shSyncRate','shReset','shSmooth'],
  FX:['fx1Type','fx1Mix','fx1PA','fx1PB','fx1PC','fx1PD','fx1PE','fx1PF','fx1PG','fx1PH','fx2Type','fx2Balance','fx2PA','fx2PB','fx2PC','fx2PD','fx2PE','fx2PF','driveType','driveLevel'],
  Mod:Array.from({length:12},(_,i)=>[`mod${i+1}Src`,`mod${i+1}Dst`,`mod${i+1}Lvl`,`mod${i+1}Off`]).flat(),
  Track:['trkInput','trkPoints','trkPreset'],
  Output:['outputLevel','patchName','knobX','knobY','knobZ'],
};

function tabHasDiff(tabName) {
  const def = defaultPatch();
  return (PARAM_TAB_MAP[tabName]||[]).some(k=>S.patch[k]!==undefined && S.patch[k]!==def[k]);
}

function renderSearchResults(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const [tabName, keys] of Object.entries(PARAM_TAB_MAP)) {
    const matched = keys.filter(k => k.toLowerCase().includes(q));
    if (!matched.length) continue;
    results.push(html`<div>
      <div class=search-tab-label>${tabName}</div>
      ${matched.map(k => pRow(k, k, (NRPN_MAP[k]?.min??0), (NRPN_MAP[k]?.max??127)))}
    </div>`);
  }
  return results.length
    ? html`<div class=search-results>${results}</div>`
    : html`<div class=no-results>No params matching "${query}"</div>`;
}

export function renderPatchTab() {
  const q = S.paramSearch || '';
  return html`<div>
    <div class=ptabs>${PATCH_TABS.map(t=>html`<button class=${'tbtn'+(S.patchTab===t?' active':'')} onclick=${()=>{S.patchTab=t;S.paramSearch='';window._micronRender?.();}}>
      ${t}${tabHasDiff(t)?html`<span class=tab-dot></span>`:null}
    </button>`)}</div>
    <input placeholder="Search all params..." value=${q} oninput=${e=>{S.paramSearch=e.target.value;window._micronRender?.();}} class="search-in psearch" />
    ${q ? renderSearchResults(q) : (TAB_RENDERERS[S.patchTab]||voiceTab)()}
  </div>`;
}
