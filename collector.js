(()=>{if(window.__PEKALOG_COLLECTOR_RUNNING)return;window.__PEKALOG_COLLECTOR_RUNNING=true;
const MACH=['651','652','653','655','656','657','658','660','661','662','663','707','708','710','711','712','713','715','716','717','718','720'];
const EP=['nc-m06-001.php','nc-m06-008.php','nc-m06-003.php'];
const pad=x=>String(Number(x)).padStart(4,'0');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const box=document.createElement('div');box.id='pekalogCollectorBox';box.style='position:fixed;z-index:2147483647;left:12px;right:12px;top:12px;max-height:88vh;overflow:auto;background:#111827;color:#fff;border:2px solid #67e8f9;border-radius:18px;padding:16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 14px 40px #0008';
box.innerHTML='<div style="font-size:20px;font-weight:900">🧪 PEKALOG 収集係</div><div id="pkst" style="margin-top:8px;font-size:14px;line-height:1.6">準備中…</div><div id="pkbuttons" style="margin-top:12px"></div>';
document.documentElement.appendChild(box);const st=box.querySelector('#pkst'),bt=box.querySelector('#pkbuttons');
const fail=m=>{st.innerHTML='❌ '+m+'<br><small>ゴージャグ等の台詳細画面を開いて、一度ページを表示してからもう一度実行してね。</small>';bt.innerHTML='<button id="pkclose" style="padding:12px 18px;border:0;border-radius:12px;font-weight:800">閉じる</button>';bt.querySelector('#pkclose').onclick=()=>{box.remove();window.__PEKALOG_COLLECTOR_RUNNING=false}};
(async()=>{try{
 const resources=performance.getEntriesByType('resource').map(x=>x.name).filter(Boolean);
 let templates={};for(const ep of EP){const hits=resources.filter(u=>u.includes('/'+ep));if(hits.length)templates[ep]=hits[hits.length-1]}
 if(!templates[EP[0]])return fail('基本データ通信が見つからないよ。');
 for(const ep of EP.slice(1)){if(!templates[ep]){const u=new URL(templates[EP[0]]);u.pathname=u.pathname.replace(/nc-m06-001\.php$/,ep);templates[ep]=u.toString()}}
 const date=(new URL(templates[EP[0]])).searchParams.get('YMD_biz')||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
 const get=async(tpl,m)=>{const u=new URL(tpl);u.searchParams.set('cd_dai',pad(m));u.searchParams.set('_',Date.now().toString());const r=await fetch(u.toString(),{credentials:'same-origin',cache:'no-store'});const text=await r.text();if(!r.ok)throw new Error('HTTP '+r.status);try{return JSON.parse(text)}catch(e){throw new Error('JSONではない応答')}};
 const pkg={kind:'pekalog-collector',version:'0.4',capturedAt:new Date().toISOString(),date:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8),source:location.href,machines:[]};
 for(let i=0;i<MACH.length;i++){const m=MACH[i];st.innerHTML=`📡 ${i+1}/${MACH.length}台　<strong>${m}番</strong>を取得中…`;
   const rs=await Promise.allSettled(EP.map(ep=>get(templates[ep],m)));const rec={machine:m};['basic','history','graph'].forEach((k,j)=>{rec[k]=rs[j].status==='fulfilled'?rs[j].value:{error:String(rs[j].reason?.message||rs[j].reason)}});pkg.machines.push(rec);await sleep(280)}
 const ok=pkg.machines.filter(x=>!x.basic?.error).length;st.innerHTML=`✅ <strong>${ok}/${MACH.length}台 収集完了！</strong><br><small>JSONを保存して、PEKALOG LABの「収集JSONを読み込む」へ。</small>`;
 const text=JSON.stringify(pkg);bt.innerHTML='<button id="pksave" style="padding:12px 14px;border:0;border-radius:12px;background:#4ade80;font-weight:900;margin-right:8px">⬇ JSONを保存</button><button id="pkcopy" style="padding:12px 14px;border:0;border-radius:12px;background:#67e8f9;font-weight:900;margin-right:8px">📋 JSONをコピー</button><button id="pkclose" style="padding:12px 14px;border:0;border-radius:12px;font-weight:800">閉じる</button>';
 bt.querySelector('#pksave').onclick=()=>{const b=new Blob([text],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`pekalog_turkey_${date}_${new Date().toTimeString().slice(0,5).replace(':','')}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)};
 bt.querySelector('#pkcopy').onclick=async()=>{try{await navigator.clipboard.writeText(text);alert('収集JSONをコピーしたよ！')}catch(e){const ta=document.createElement('textarea');ta.value=text;ta.style='width:100%;height:220px;margin-top:10px';box.appendChild(ta);ta.select();alert('コピーできなかったので、下のJSONを長押ししてコピーしてね')}};
 bt.querySelector('#pkclose').onclick=()=>{box.remove();window.__PEKALOG_COLLECTOR_RUNNING=false};
 }catch(e){fail(e.message||String(e))}})();})();