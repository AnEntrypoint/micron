import { html } from './micron-ui-core.js';
import { S } from './micron-state.js';
import { sendParam } from './micron-patch.js';
import { pushUndo } from './micron-state.js';
import { FILTER_TYPES,FX1_TYPES,FX2_TYPES,DRIVE_TYPES,PREFLT_SOURCES,F2_OFFSET_TYPES,filterHz,FX1_PARAM_NAMES,FX2_PARAM_NAMES,MOD_SRCS,MOD_DSTS,TRACKING_PRESETS } from './micron-data.js';

export function sp(key, val) { pushUndo(S.patch); S.patch[key]=val; sendParam(key,val); }

export function pRow(label, key, min, max, step=1, display=null) {
  const v = S.patch[key]??0;
  const disp = display ? display(v) : v;
  const r = (e) => { sp(key,+e.target.value); window._micronRender?.(); };
  const editing = S._pvEdit===key;
  const commitEdit = (raw) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) sp(key, Math.max(min, Math.min(max, Math.round(n/step)*step)));
    S._pvEdit = null; window._micronRender?.();
  };
  return html`<div class=pr>
    <label>${label}</label>
    <input type=range min=${min} max=${max} step=${step} value=${v} class=rs oninput=${r} />
    ${editing
      ? html`<input type=text class=pv-edit autofocus value=${v}
          onblur=${e=>commitEdit(e.target.value)}
          onkeydown=${e=>{if(e.key==='Enter')commitEdit(e.target.value);if(e.key==='Escape'){S._pvEdit=null;window._micronRender?.();}}} />`
      : html`<span class=pv onclick=${()=>{S._pvEdit=key;window._micronRender?.();}} title="Click to type value">${disp}</span>`}
  </div>`;
}

export function pSel(label, key, opts) {
  const v = S.patch[key]??0;
  const r = (e) => { sp(key,+e.target.value); window._micronRender?.(); };
  return html`<div class=pr><label>${label}</label><select onchange=${r}>${opts.map((o,i)=>html`<option value=${i} selected=${v===i}>${o}</option>`)}</select></div>`;
}

export function sec(title, color, ...children) {
  const key = 'sec_'+title;
  const collapsed = S.collapsedSections[key];
  return html`<div class=${'section '+(color==='orange'?'orange':'')}>
    <h4 class=sh onclick=${()=>{S.collapsedSections[key]=!collapsed;window._micronRender?.();}}>${title}<span class=sa>${collapsed?'▶':'▼'}</span></h4>
    ${!collapsed?children:null}
  </div>`;
}

export function filterTab() {
  return html`<div class=grid2>
    ${[0,1].map(fi=>{const f=['f1','f2'][fi]; const cutoff=S.patch[`${f}Cutoff`]??512; const res=S.patch[`${f}Res`]??0; return html`<div class="osc-col">
      <h4>Filter ${fi+1}</h4>
      ${filterCurve(cutoff,res)}
      ${pSel('Type',`${f}Type`,FILTER_TYPES)}
      ${pRow('Cutoff',`${f}Cutoff`,0,1023,1,v=>v>=1023?'20kHz':filterHz(v)<1000?filterHz(v).toFixed(0)+'Hz':(filterHz(v)/1000).toFixed(2)+'kHz')}
      ${pRow('Resonance',`${f}Res`,0,100)}
      ${pRow('Env Amt',`${f}EnvAmt`,-100,100)}
      ${pRow('Keytrack',`${f}Keytrk`,-100,200)}
      ${fi===0?html`<div class=pr><label>Polarity</label><select onchange=${e=>{sp('f1Polarity',+e.target.value);window._micronRender?.();}}><option value=0 selected=${!S.patch.f1Polarity}>positive</option><option value=1 selected=${!!S.patch.f1Polarity}>negative</option></select></div>`:html`<div>${pSel('Offset Type','f2OffsetType',F2_OFFSET_TYPES)}${pRow('Offset Freq','f2OffsetFreq',-400,400,1,v=>(v/100).toFixed(2)+' oct')}</div>`}
      ${pRow('Level',`${f}Level`,0,100)}
      ${pRow('Pan',`${f}Pan`,-100,100)}
    </div>`;} )}
    ${sec('Post-Filter Mix','orange',
      pRow('Unfiltered Lvl','unfiltLevel',0,100),
      pSel('Unfiltered Src','unfiltSrc',PREFLT_SOURCES),
      pRow('Unfiltered Pan','unfiltPan',-100,100)
    )}
  </div>`;
}

function filterCurve(cutoff, res) {
  const W=160, H=36, cx=Math.round(cutoff/1023*W);
  const rh=Math.round(res/100*20);
  const pts=[`0,${H}`,`${cx-12},${H}`,`${cx-4},${H-4-rh}`,`${cx},${H-8-rh*1.5}`,`${cx+4},${H-4-rh}`,`${cx+12},${H}`,`${W},${H}`].join(' ');
  return html`<svg width=${W} height=${H} style="display:block;margin-bottom:4px;opacity:0.7">
    <polyline points=${pts} fill="none" stroke="#00e5ff" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

export function fxTab() {
  const ft1 = S.patch.fx1Type??0, ft2 = S.patch.fx2Type??0;
  const p1 = FX1_PARAM_NAMES[ft1]||FX1_PARAM_NAMES[0];
  const p2 = FX2_PARAM_NAMES[ft2]||FX2_PARAM_NAMES[0];
  return html`<div>
    ${sec('FX 1','cyan',
      pSel('Type','fx1Type',FX1_TYPES),
      pRow('Wet/Dry','fx1Mix',0,100),
      ...['A','B','C','D','E','F','G','H'].map(l=>p1[l]&&p1[l]!=='—'?pRow(p1[l],`fx1P${l}`,0,127):null).filter(Boolean)
    )}
    ${sec('FX 2','orange',
      pSel('Type','fx2Type',FX2_TYPES),
      pRow('FX Balance','fx2Balance',0,100),
      ...['A','B','C','D','E','F'].map(l=>p2[l]&&p2[l]!=='—'?pRow(p2[l],`fx2P${l}`,-128,127):null).filter(Boolean)
    )}
    ${sec('Drive','orange',
      pSel('Drive Type','driveType',DRIVE_TYPES),
      pRow('Drive Level','driveLevel',0,100)
    )}
  </div>`;
}

export function modTab() {
  const showAll = S._modShowAll;
  const rows = Array.from({length:12},(_,i)=>{
    const src=S.patch[`mod${i+1}Src`]??0,dst=S.patch[`mod${i+1}Dst`]??0,lvl=S.patch[`mod${i+1}Lvl`]??0,off=S.patch[`mod${i+1}Off`]??0;
    return {i,src,dst,lvl,off};
  });
  const active = rows.filter(r=>r.src!==0||r.dst!==0||r.lvl!==0||r.off!==0);
  const firstEmpty = rows.find(r=>r.src===0&&r.dst===0&&r.lvl===0&&r.off===0);
  const visible = showAll ? rows : [...active, ...(firstEmpty?[firstEmpty]:[])];
  return html`<div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:10px;color:var(--text2)">${active.length} active slot${active.length!==1?'s':''}</span>
      <button class=${'tbtn'+(showAll?' active':'')} style="padding:2px 8px;font-size:10px" onclick=${()=>{S._modShowAll=!showAll;window._micronRender?.();}}>${showAll?'Show active':'Show all 12'}</button>
    </div>
    <div class=table-wrap>
      <table class=mod-table>
        <thead><tr><th>#</th><th>Source</th><th>Dest</th><th>Level %</th><th>Offset %</th></tr></thead>
        <tbody>
          ${visible.map(({i,src,dst,lvl,off})=>html`<tr>
            <td class=tc>${i+1}</td>
            <td><select onchange=${e=>{sp(`mod${i+1}Src`,+e.target.value);window._micronRender?.();}} class=sel-sm>${MOD_SRCS.map((s,j)=>html`<option value=${j} selected=${src===j}>${s}</option>`)}</select></td>
            <td><select onchange=${e=>{sp(`mod${i+1}Dst`,+e.target.value);window._micronRender?.();}} class=sel-sm>${MOD_DSTS.map((d,j)=>html`<option value=${j} selected=${dst===j}>${d}</option>`)}</select></td>
            <td><input type=range min=-1000 max=1000 value=${lvl} class=rs-sm oninput=${e=>{sp(`mod${i+1}Lvl`,+e.target.value);window._micronRender?.();}} /><br/><span class=pv-sm>${(lvl/10).toFixed(1)}</span></td>
            <td><input type=range min=-1000 max=1000 value=${off} class=rs-sm oninput=${e=>{sp(`mod${i+1}Off`,+e.target.value);window._micronRender?.();}} /><br/><span class=pv-sm>${(off/10).toFixed(1)}</span></td>
          </tr>`)}
        </tbody>
      </table>
    </div>
  </div>`;
}

export function trackTab() {
  const points = S.patch.trkPoints?16:12;
  const half = points===16?8:6;
  return html`<div>
    ${sec('Tracking Generator','cyan',
      pSel('Input','trkInput',['none',...MOD_DSTS.slice(0,20)]),
      pSel('Points','trkPoints',['12 points','16 points']),
      pSel('Preset','trkPreset',TRACKING_PRESETS),
      html`<div>
        <div class=trk-grid>${Array.from({length:points+1},(_,i)=>{
          const y=S.patch[`trkY${i}`]??0;
          return html`<div class=trk-bar-col style=${'min-height:6px;height:'+Math.abs(y)*0.6+'px;background:'+(y>=0?'#00e5ff':'#ff6b00')+';cursor:ns-resize'} title=${`x=${i-half} y=${y}%`} onmousedown=${ev=>{
            const startY=ev.clientY,startV=y;
            const onMove=e=>{const dy=startY-e.clientY;sp(`trkY${i}`,Math.max(-100,Math.min(100,Math.round(startV+dy))));window._micronRender?.();};
            const up=()=>{document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',up);};
            document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',up);
          }}></div>`;
        })}</div>
        <div style="display:flex;justify-content:space-between;padding:0 2px;margin-top:2px">
          ${Array.from({length:points+1},(_,i)=>html`<span style="font-size:8px;color:var(--text3);flex:1;text-align:center">${i-half}</span>`)}
        </div>
      </div>`
    )}
  </div>`;
}
