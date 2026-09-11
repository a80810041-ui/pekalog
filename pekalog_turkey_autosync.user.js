// ==UserScript==
// @name         PEKALOG Turkey Auto Sync
// @namespace    https://a80810041-ui.github.io/pekalog/
// @version      1.0.0
// @description  鷺沼ターキーのジャグラー22台を自動巡回し、PEKALOG/LABへ同期します。
// @match        https://www.pscube.jp/h/a707001/cgi-bin/nc-v06-001.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
'use strict';

const STATE_KEY = 'pekalog_auto_sync_state_v1';
const MACHINES = ['651','652','653','655','656','657','658','660','661','662','663','707','708','710','711','712','713','715','716','717','718','720'];
const MAX_AGE = 10 * 60 * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const normMachine = v => String(Number(String(v || '').replace(/\D/g,'')) || '');

function hashArgs(){
  const raw = location.hash.replace(/^#/,'');
  return new URLSearchParams(raw);
}
function loadState(){
  try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null'); }
  catch { return null; }
}
function saveState(s){ sessionStorage.setItem(STATE_KEY, JSON.stringify(s)); }
function clearState(){ sessionStorage.removeItem(STATE_KEY); }

function startIfRequested(){
  const h = hashArgs();
  if(h.get('pekalog_sync') !== '1') return loadState();
  const returnUrl = h.get('return') || '';
  const sid = h.get('sid') || String(Date.now());
  const s = {
    active: true,
    sid,
    returnUrl,
    startedAt: Date.now(),
    index: 0,
    machines: MACHINES,
    records: {},
    date: null
  };
  saveState(s);
  return s;
}

function addOverlay(state, message){
  let box = document.getElementById('pekalog-auto-sync-overlay');
  if(!box){
    box = document.createElement('div');
    box.id = 'pekalog-auto-sync-overlay';
    box.style.cssText = [
      'position:fixed','z-index:2147483647','left:12px','right:12px','top:12px',
      'background:#111820','color:white','border:1px solid #394758','border-radius:16px',
      'padding:13px 14px','font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'box-shadow:0 10px 35px rgba(0,0,0,.45)','font-size:14px','line-height:1.45'
    ].join(';');
    document.documentElement.appendChild(box);
  }
  const n = Math.min(state.index + 1, state.machines.length);
  box.innerHTML = `
    <div style="font-weight:800;font-size:16px">🦃 PEKALOG 同期中</div>
    <div style="margin-top:4px">${message || `${n}/${state.machines.length}台`}</div>
    <div style="height:7px;background:#28313b;border-radius:99px;margin-top:8px;overflow:hidden">
      <div style="height:100%;width:${Math.round((state.index/state.machines.length)*100)}%;background:#7de3ff"></div>
    </div>
    <button id="pekalog-sync-cancel" style="margin-top:9px;border:0;border-radius:10px;padding:7px 10px;background:#2a313d;color:white">同期を中止</button>`;
  box.querySelector('#pekalog-sync-cancel').onclick = () => {
    const ret = state.returnUrl;
    clearState();
    if(ret) location.replace(ret + (ret.includes('#') ? '&' : '#') + 'pekalogSyncCancelled=1');
  };
}

function rowMap(table){
  const out = {};
  if(!table) return out;
  for(const tr of table.querySelectorAll('tr')){
    const c = [...tr.querySelectorAll('th,td')].map(x => x.innerText.trim());
    if(c.length >= 2) out[c[0]] = c[1];
  }
  return out;
}
function parseStat(table){
  const m = rowMap(table);
  const big = Number(m.BIG) || 0;
  const reg = Number(m.REG) || 0;
  const combined = m['合成確率'] || m['合算'] || '';
  const den = Number((combined.match(/1\/([\d.]+)/) || [])[1]) || null;
  return {big, reg, combined, totalGEst: den ? Math.round((big + reg) * den) : null};
}
function uniq(a){ return [...new Set(a.map(x => Math.round(x * 100) / 100))]; }
function fit(xs, ys){
  const n = Math.min(xs.length, ys.length);
  if(n < 2) return null;
  let sx=0, sy=0, sxx=0, sxy=0;
  for(let i=0;i<n;i++){ sx+=xs[i]; sy+=ys[i]; sxx+=xs[i]*xs[i]; sxy+=xs[i]*ys[i]; }
  const d = n*sxx - sx*sx;
  if(!d) return null;
  const a = (n*sxy - sx*sy) / d;
  return {a, b:(sy-a*sx)/n};
}
const r10 = v => Math.round(v/10)*10;

function parseGraph(svg){
  if(!svg) return null;
  const graph = [...svg.querySelectorAll('path.amcharts-graph-stroke')]
    .sort((a,b)=>(b.getAttribute('d')||'').length-(a.getAttribute('d')||'').length)[0];
  if(!graph) return null;

  const plot = svg.querySelector('.amcharts-plot-area');
  let pb = {x:0,y:0,width:9999,height:9999};
  try {
    if(plot){
      const b = plot.getBBox();
      pb = {x:b.x,y:b.y,width:b.width,height:b.height};
    }
  } catch {}

  const ys = uniq([...svg.querySelectorAll('.amcharts-axis-grid,.amcharts-axis-zero-grid')]
    .map(el => {
      try {
        const b = el.getBBox();
        return b.width > 100 && b.height < 2 ? b.y : null;
      } catch { return null; }
    }).filter(v => v !== null)).sort((a,b)=>a-b);

  const vals = uniq([...svg.querySelectorAll('text')]
    .map(t=>t.textContent.trim())
    .filter(s=>/^-?\d[\d,]*$/.test(s))
    .map(s=>Number(s.replace(/,/g,'')))
    .filter(Number.isFinite)).sort((a,b)=>b-a);

  const n = Math.min(ys.length, vals.length);
  const f = fit(ys.slice(0,n), vals.slice(0,n));

  const pts = [...(graph.getAttribute('d')||'').matchAll(/[ML]\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)]
    .map(m=>({x:+m[1], y:+m[2]}))
    .filter(p =>
      p.x >= pb.x-1 && p.x <= pb.x+pb.width+1 &&
      p.y >= pb.y-1 && p.y <= pb.y+pb.height+1 &&
      !(p.x===0 && p.y===0)
    );

  if(!f || !pts.length) return null;
  const vv = pts.map(p => f.a*p.y + f.b);
  const cur = vv[vv.length-1], peak = Math.max(...vv), trough = Math.min(...vv);
  return {
    currentDiffEst:r10(cur),
    peakDiffEst:r10(peak),
    troughDiffEst:r10(trough),
    current1000:cur>=1000,
    current2000:cur>=2000,
    peak1000:peak>=1000,
    peak2000:peak>=2000
  };
}

function statTables(doc){
  return [...doc.querySelectorAll('table')].filter(t => {
    const m = rowMap(t);
    return Object.prototype.hasOwnProperty.call(m,'BIG') &&
           Object.prototype.hasOwnProperty.call(m,'REG') &&
           (Object.prototype.hasOwnProperty.call(m,'合成確率') || Object.prototype.hasOwnProperty.call(m,'合算'));
  }).slice(0,3);
}

function parsePage(){
  const text = (document.body?.innerText || '').replace(/\r/g,'');
  const machine = (text.match(/台番号\s*0?(\d{3,4})/) || [])[1] || normMachine(new URL(location.href).searchParams.get('cd_dai'));
  const model = (document.title.split('｜').pop() || '').trim();
  const updated = (text.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2})\s*更新/) || [])[1] || '';
  const sts = statTables(document);

  const currentGame = (() => {
    const m = text.match(/(?:^|\n)\s*(\d+)\s*\n\s*最終ゲーム(?:\n|$)/m);
    return m ? Number(m[1]) : null;
  })();

  const historyRows = [];
  const histTable = [...document.querySelectorAll('table')].find(t => {
    const head = [...t.querySelectorAll('tr:first-child th,tr:first-child td')].map(x=>x.innerText.trim());
    return ['回数','時刻','ゲーム','ステータス'].every(x=>head.includes(x));
  });
  if(histTable){
    for(const tr of histTable.querySelectorAll('tr')){
      const c=[...tr.querySelectorAll('th,td')].map(x=>x.innerText.trim());
      if(c.length>=4 && /^\d+$/.test(c[0]) && /^\d{1,2}:\d{2}$/.test(c[1]) &&
         /^\d+$/.test(c[2]) && /^(BIG|REG)$/.test(c[3])){
        historyRows.push({count:+c[0],time:c[1],game:+c[2],status:c[3]});
      }
    }
  }

  const svgs = [...document.querySelectorAll('svg')].filter(svg => {
    const tt=[...svg.querySelectorAll('text')].map(t=>t.textContent.trim());
    return tt.includes('12:00') && tt.includes('18:00');
  });

  return {
    machine:normMachine(machine),
    model,
    updated,
    capturedAt:new Date().toISOString(),
    stats:{
      today:parseStat(sts[0]),
      prev1:parseStat(sts[1]),
      prev2:parseStat(sts[2])
    },
    currentGame,
    graphs:{
      today:parseGraph(svgs[0]),
      prev1:parseGraph(svgs[1]),
      prev2:parseGraph(svgs[2])
    },
    historyRows:historyRows.slice(0,20)
  };
}

async function waitReady(){
  for(let i=0;i<60;i++){
    const text = document.body?.innerText || '';
    if(/台番号\s*0?\d{3,4}/.test(text) && statTables(document).length >= 3){
      await sleep(500);
      return true;
    }
    await sleep(200);
  }
  return false;
}

function b64url(obj){
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binary = '';
  const chunk = 0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary += String.fromCharCode(...bytes.subarray(i,i+chunk));
  }
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function main(){
  let state = startIfRequested();
  if(!state || !state.active) return;
  if(Date.now() - Number(state.startedAt||0) > MAX_AGE){
    clearState();
    return;
  }

  const expected = state.machines[state.index];
  const current = normMachine(new URL(location.href).searchParams.get('cd_dai'));
  if(current !== expected){
    addOverlay(state, `次の台へ移動中… ${expected}番`);
    const u = new URL(location.href);
    u.searchParams.set('cd_dai', String(expected).padStart(4,'0'));
    u.hash = '';
    location.replace(u.toString());
    return;
  }

  addOverlay(state, `${state.index+1}/${state.machines.length}台　${current}番を読取中…`);
  const ready = await waitReady();

  try {
    if(!ready) throw new Error('ページ読取タイムアウト');
    const rec = parsePage();
    state.records[current] = rec;
    if(!state.date && rec.updated){
      state.date = rec.updated.slice(0,10).replaceAll('/','-');
    }
  } catch(e) {
    state.records[current] = {machine:current,error:String(e&&e.message||e),capturedAt:new Date().toISOString()};
  }

  state.index += 1;
  saveState(state);

  if(state.index < state.machines.length){
    const next = state.machines[state.index];
    addOverlay(state, `保存完了。次は ${next}番…`);
    await sleep(250);
    const u = new URL(location.href);
    u.searchParams.set('cd_dai', String(next).padStart(4,'0'));
    u.hash = '';
    location.replace(u.toString());
    return;
  }

  const rows = state.machines.map(m=>state.records[m]).filter(Boolean);
  const bundle = {
    kind:'pekalog-turkey-bundle',
    version:'2.0-auto-sync',
    date:state.date || new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date()),
    collected:rows.filter(x=>!x.error).length,
    total:state.machines.length,
    completed:true,
    syncedAt:new Date().toISOString(),
    machines:rows
  };

  // URL帰還用は履歴を軽量化
  const compact = JSON.parse(JSON.stringify(bundle));
  compact.machines.forEach(x => { if(x && x.historyRows) delete x.historyRows; });

  const ret = state.returnUrl;
  clearState();
  addOverlay({index:MACHINES.length,machines:MACHINES}, `✅ ${bundle.collected}/${bundle.total}台 同期完了。PEKALOGへ戻ります…`);
  await sleep(450);

  if(ret){
    const clean = ret.split('#')[0];
    location.replace(clean + '#pekalogSyncData=' + b64url(compact));
  }
}

main().catch(e=>{
  const state=loadState();
  if(state && state.returnUrl){
    const clean=state.returnUrl.split('#')[0];
    clearState();
    location.replace(clean+'#pekalogSyncError='+encodeURIComponent(String(e&&e.message||e)));
  }
});
})();
