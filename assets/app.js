'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],root=document.body.dataset.root||'';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
let saved=new Set(store.get('jisei-bookmarks',[])),catalog=[],font=store.get('jisei-font',1);
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.hidden=true,2600)}
function updateSaved(){ $$('[data-save]').forEach(b=>{const on=saved.has(b.dataset.save);b.setAttribute('aria-pressed',on);if(!b.classList.contains('card-save'))b.textContent=on?'栞を外す':'栞を挟む';else {b.textContent=on?'◆':'◇';b.setAttribute('aria-label',b.getAttribute('aria-label').replace(on?'栞を挟む':'栞を外す',on?'栞を外す':'栞を挟む'))}}); }
function toggleSave(id){if(saved.has(id)){saved.delete(id);toast('栞を外しました')}else{saved.add(id);toast('このブラウザに栞を保存しました')}store.set('jisei-bookmarks',[...saved]);updateSaved()}
function initPreferences(){document.body.classList.toggle('dark',document.documentElement.dataset.color==='dark');document.documentElement.style.setProperty('--size',font);updateSaved()}
initPreferences();
async function getCatalog(){if(!catalog.length){const r=await fetch(root+'data/catalog.json');if(!r.ok)throw Error('load');catalog=await r.json()}return catalog}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('コピーしました')}catch{toast('コピーできませんでした。本文を選択してコピーしてください')}}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,[data-focus]');if(!b)return;
 if(b.dataset.save){toggleSave(b.dataset.save);if($('#cards')&&state.saved)render();return}
 const action=b.dataset.action;
 if(action==='dark'){const on=!document.body.classList.contains('dark');document.body.classList.toggle('dark',on);try{localStorage.setItem('jisei-color',on?'dark':'light')}catch{}return}
 if(action==='random'){try{const a=await getCatalog();location.href=root+'people/'+a[Math.floor(Math.random()*a.length)].id+'.html'}catch{toast('データを読み込めませんでした')}return}
 if(action==='copy-poem'){copy($('blockquote',b.closest('.work')).textContent);return}
 if(action==='share'){const data={title:document.title,url:location.href};if(navigator.share){try{await navigator.share(data)}catch{}}else copy(location.href);return}
 if(action==='font-up'||action==='font-down'){font=Math.min(1.5,Math.max(.85,font+(action==='font-up'?.1:-.1)));document.documentElement.style.setProperty('--size',font);store.set('jisei-font',font);return}
 if(action==='vertical'){const on=!document.body.classList.contains('vertical');document.body.classList.toggle('vertical',on);b.setAttribute('aria-pressed',on);b.textContent=on?'句を横書きに':'句を縦書きに';return}
 if(action==='print'){print();return}
 if(b.dataset.focus==='genre')setTimeout(()=>$('#genre')?.focus(),350);
 if(action==='compare'){await openCompare();return}
 if(b.classList.contains('compare-close'))$('#compare-dialog').close();
});
const state={q:'',era:'',genre:'',theme:'',saved:false,sort:'featured',page:1,list:false};
function normalize(s){return s.normalize('NFKC').toLowerCase().replace(/[\s　]+/g,' ')}
function syncURL(){const p=new URLSearchParams;for(const k of ['q','era','genre','theme'])if(state[k])p.set(k,state[k]);if(state.saved)p.set('saved','1');if(state.sort!=='featured')p.set('sort',state.sort);history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+(location.hash||''))}
function filterCatalog(){const terms=normalize(state.q).split(' ').filter(Boolean);let arr=catalog.filter(p=>(!state.era||p.era===state.era)&&(!state.genre||p.genres.includes(state.genre))&&(!state.theme||p.themes.includes(state.theme))&&(!state.saved||saved.has(p.id))&&terms.every(t=>normalize(p.fullName+' '+p.search+' '+p.themes.join(' ')).includes(t)));
 if(state.sort==='old')arr.sort((a,b)=>(a.year??99999)-(b.year??99999)||a.id.localeCompare(b.id));
 if(state.sort==='new')arr.sort((a,b)=>(b.year??-99999)-(a.year??-99999)||a.id.localeCompare(b.id));
 if(state.sort==='name')arr.sort((a,b)=>a.fullName.localeCompare(b.fullName,'ja'));
 return arr}
function render(){const all=filterCatalog(),pages=Math.max(1,Math.ceil(all.length/24));state.page=Math.max(1,Math.min(state.page,pages));$('#result-count').textContent=all.length;$('#active-filter').textContent=[state.era,state.genre,state.theme,state.saved?'栞':''].filter(Boolean).join(' / ');$('#cards').classList.toggle('list',state.list);
 $('#cards').innerHTML=all.slice((state.page-1)*24,state.page*24).map(p=>`<article class="card"><div class="card-meta">${p.image?`<img src="${escapeHTML(p.image)}" class="portrait-thumb" alt="" loading="lazy" width="27" height="27">`:''}<span>${escapeHTML(p.era)}</span><span>／ ${escapeHTML(p.genres[0])}</span></div><button class="card-save" data-save="${p.id}" aria-label="${escapeHTML(p.name)}に栞を挟む" aria-pressed="${saved.has(p.id)}">${saved.has(p.id)?'◆':'◇'}</button><div class="card-quote">${escapeHTML(p.quote.slice(0,80))}${p.quote.length>80?'…':''}</div><div><h3><a href="people/${p.id}.html">${escapeHTML(p.name)}</a></h3><div class="dates">${escapeHTML(p.life)}</div></div><div class="tag-line">${escapeHTML(p.tag)} <span aria-hidden="true">↗</span></div></article>`).join('')||'<div class="empty"><p>条件に合う人物が見つかりませんでした。</p><button class="small-btn" id="empty-reset">条件をリセットする</button></div>';
 $('#page-count').textContent=`${state.page} / ${pages} 頁`;$('#prev').disabled=state.page===1;$('#next').disabled=state.page===pages;$$('#eras button').forEach(b=>{b.classList.toggle('active',b.dataset.era===state.era);b.setAttribute('aria-pressed',b.dataset.era===state.era)});$('#genre').value=state.genre;$('#theme').value=state.theme;$('#sort').value=state.sort;$('#saved-only').setAttribute('aria-pressed',state.saved);syncURL();updateSaved();$('#empty-reset')?.addEventListener('click',reset);
}
function reset(){Object.assign(state,{q:'',era:'',genre:'',theme:'',saved:false,page:1});$('#search').value='';render()}
async function initArchive(){try{
 await getCatalog();const params=new URLSearchParams(location.search);for(const k of ['q','era','genre','theme','sort'])if(params.has(k))state[k]=params.get(k);state.saved=params.get('saved')==='1';$('#search').value=state.q;
 const eras=['','古代','平安','中世・戦国','江戸','近代・現代','年代不詳'];$('#eras').innerHTML=eras.map(er=>`<button data-era="${er}" aria-pressed="false">${er||'すべての年代'}</button>`).join('');
 [...new Set(catalog.flatMap(p=>p.genres))].sort().forEach(g=>$('#genre').add(new Option(g,g)));
 const themeCounts={};catalog.forEach(p=>p.themes.forEach(t=>themeCounts[t]=(themeCounts[t]||0)+1));const themes=Object.keys(themeCounts).sort((a,b)=>themeCounts[b]-themeCounts[a]||a.localeCompare(b,'ja'));
 themes.forEach(t=>$('#theme').add(new Option(`${t}（${themeCounts[t]}人）`,t)));
 $('#theme-cloud').innerHTML=themes.slice(0,18).map(t=>`<button class="theme-pill" data-theme="${escapeHTML(t)}">${escapeHTML(t)}<span>${themeCounts[t]}</span></button>`).join('');
 $('#chart').insertAdjacentHTML('afterbegin',themes.slice(0,6).map(t=>`<div class="bar-row"><span>${escapeHTML(t)}</span><div class="bar-track"><div class="bar-fill" style="width:${100*themeCounts[t]/themeCounts[themes[0]]}%"></div></div><span>${themeCounts[t]}人</span></div>`).join(''));$('#chart').insertAdjacentHTML('beforeend','<p class="footnote">全537人中。複数タグ・暫定分類による記述集計。<br>日本人全体の意識を代表する数値ではありません。</p>');
 $('#eras').addEventListener('click',e=>{if(e.target.dataset.era!==undefined){state.era=e.target.dataset.era;state.page=1;render()}});
 for(const key of ['genre','theme','sort'])$('#'+key).addEventListener('change',e=>{state[key]=e.target.value;state.page=1;render()});
 let timer;$('#search').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>{state.q=e.target.value;state.page=1;render()},180)});
 $('#saved-only').addEventListener('click',()=>{state.saved=!state.saved;state.page=1;render()});$('#reset').addEventListener('click',reset);
 $('#view').addEventListener('click',e=>{state.list=!state.list;e.currentTarget.setAttribute('aria-pressed',state.list);e.currentTarget.setAttribute('aria-label',state.list?'カード表示に切り替える':'一覧表示に切り替える');render()});
 for(const [key,delta]of [['prev',-1],['next',1]])$('#'+key).addEventListener('click',()=>{state.page+=delta;render();$('#archive').scrollIntoView({behavior:'smooth'})});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-theme]');if(!b)return;state.theme=b.dataset.theme;state.page=1;render();$('#archive').scrollIntoView({behavior:'smooth'})});
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();$('#archive').scrollIntoView()}});
 render();
 }catch(e){$('#cards').innerHTML='<div class="empty">読み込みに失敗しました。<a href="all.html">全人物目録からお読みください →</a></div>';console.error(e)}}
async function openCompare(){try{await getCatalog();const all=filterCatalog(),defaults=[...all.slice(0,3),...catalog.slice(0,3)].slice(0,3);$('#compare-grid').innerHTML=defaults.map((p,i)=>`<section><label for="compare-${i}" class="filter-title">${i+1}人目</label><select id="compare-${i}" class="compare-select">${[...catalog].sort((a,b)=>a.name.localeCompare(b.name,'ja')).map(x=>`<option value="${x.id}"${x.id===p.id?' selected':''}>${escapeHTML(x.name)}</option>`).join('')}</select><div class="compare-text"></div></section>`).join('');$$('.compare-select').forEach(s=>{const update=()=>{const p=catalog.find(p=>p.id===s.value);$('.compare-text',s.parentElement).innerHTML=`<blockquote>${escapeHTML(p.quote)}</blockquote><p>${escapeHTML(p.tag)}</p><p><a href="people/${p.id}.html">${escapeHTML(p.name)}を読む ↗</a></p>`};s.addEventListener('change',update);update()});$('#compare-dialog').showModal()}catch{toast('比較データを読み込めませんでした')}}
if($('#cards'))initArchive();
