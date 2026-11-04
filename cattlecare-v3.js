/* CattleCare AI v3 - grouped navigation, synthetic peer benchmarking, user CSV onboarding */
(function(){
'use strict';
const PEER='농장 간 비교·추천',GUIDE='내 데이터 연결·설명서';
if(!names.includes(PEER))names.push(PEER);
if(!names.includes(GUIDE))names.push(GUIDE);
const esc3=v=>esc(String(v??''));
const isNum3=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const key3=()=>scopedKey('my-cattle-data-mode-v3');
const groups=[
{label:'홈',pages:['홈','종합 대시보드']},
{label:'개체·생산',pages:['개체관리','급이·급수','출하관리','탄소·메탄관리']},
{label:'환경·설비',pages:['환경관리','설비관리','센서 시뮬레이션']},
{label:'건강·방역',pages:['건강·복지 관리','방역·질병 이력']},
{label:'분석·비교',pages:['AI 분석','관측·품질센터','통합 분석·보고서',PEER]},
{label:'운영·보고서',pages:['작업명령','보고서',GUIDE]},
{label:'NEWS',pages:['NEWS']}
];
const classes='cattle-v3';
const style=document.createElement('style');
style.textContent='.v3-nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}.v3-nav details{position:relative}.v3-nav summary{list-style:none;cursor:pointer;border:1px solid #d4e3d4;border-radius:8px;padding:10px 13px;background:#fff;color:#264b31;font-size:12px;font-weight:650}.v3-nav summary::-webkit-details-marker{display:none}.v3-nav details[open] summary,.v3-nav .v3-current{background:#edf7ed!important;color:#006400!important;border-color:#006400!important}.v3-nav .v3-menu{display:flex;flex-direction:column;gap:4px;position:absolute;top:calc(100% + 5px);left:0;z-index:6;min-width:190px;padding:7px;background:#fff;border:1px solid #c7dcca;border-radius:10px;box-shadow:0 8px 22px #163b2033}.v3-nav .v3-menu button{display:block;width:100%;text-align:left;white-space:nowrap;border:0;background:#fff;color:#254734;border-radius:6px;padding:9px}.v3-nav .v3-menu button:hover{background:#e8f5e8}.v3-warning{padding:12px 16px;background:#f4faf4;border:1px solid #bedbc3;border-left:4px solid #006400;border-radius:9px;margin:10px 0;font-size:13px;line-height:1.65;color:#285139}.v3-match{border:1px solid #d6e5da;border-radius:9px;padding:13px;margin:10px 0;background:#fff}.v3-meter{height:7px;background:#edf2ed;border-radius:99px;overflow:hidden;margin:7px 0}.v3-meter div{height:100%;background:#006400}.v3-tablewrap{overflow-x:auto}.v3-note{font-size:12px;color:#68806a;line-height:1.7}.v3-pill{display:inline-block;background:#e7f3e8;color:#006400;border-radius:8px;padding:4px 7px;font-size:11px;font-weight:700}.v3-steps{padding-left:24px;line-height:1.9}.v3-steps li{margin-bottom:9px}@media(max-width:650px){.v3-nav{flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px}.v3-nav details{flex-shrink:0}.v3-nav .v3-menu{position:fixed;left:4vw;top:120px;max-height:65vh;overflow-y:auto}}';
document.head.appendChild(style);
function makePeers(){
const result=[];const breeds=['한우','육우','한우','한우','육우','한우','한우','육우','한우','한우','육우','한우'];
const feeds=['TMR','배합사료','TMR','배합사료','TMR','TMR','배합사료','TMR','TMR','배합사료','TMR','배합사료'];
const phases=['전기','중기','후기'];
for(let i=0;i<12;i++){
for(let day=0;day<40;day++){
const round=(n,d=2)=>Number(n.toFixed(d)), farm='DEMO-F'+String(i+1).padStart(2,'0');
const month=16+(i%5)*3+Math.floor(day/30);
const temp=round(20+(i%4)*1.6+Math.sin((day+i)/5)*2.5,1);
const humidity=Math.round(53+(i%5)*4+Math.cos((day+i)/7)*5);
const adg=round(0.68+(i%4)*0.1-(i%3)*0.025+Math.sin((day+i)/9)*0.065,3);
result.push({farm,date:'2026-10-'+String(1+day%31).padStart(2,'0'),dayIndex:day,breed:breeds[i],sex:i%4===0?'암소':'거세우',month,feed:feeds[i],phase:phases[i%3],temp,humidity,adg,weight:round(380+(month-16)*9+day*adg,1),dmi:round(8.2+month*.09+(i%3)*.3,2),source:'DEMO',mock:true});
}}
return result;
}
const peers=makePeers();
let matched=null,importSummary='';
const modes={farmBreed:'한우',farmSex:'거세우',farmMonth:'22',farmFeed:'TMR',farmPhase:'중기',wBreed:30,wMonth:30,wFeed:20,wTemp:10,wPhase:10};
function currentFarm(){
let observations=(data['개체관리']||[]).filter(r=>isNum3(r.weight)&&r.date).slice().sort((a,b)=>a.date.localeCompare(b.date));
let env=(data['환경관리']||[]).filter(r=>isNum3(r.temp)&&r.date).slice().sort((a,b)=>a.date.localeCompare(b.date));
let grow=null;
const groups={};for(const r of observations)(groups[r.id]??=[]).push(r);
const adgs=[];for(const rs of Object.values(groups)){let a=rs.at(-2),b=rs.at(-1);if(!a||!b)continue;let dt=(new Date(b.date)-new Date(a.date))/86400000;if(dt>0)adgs.push((Number(b.weight)-Number(a.weight))/dt)}
if(adgs.length)grow=adgs.reduce((s,n)=>s+n,0)/adgs.length;
return {grow,temp:env.length?Number(env.at(-1).temp):null,n:observations.length, source:observations.some(x=>!x.demo)?'실제 입력 기록과 DEMO 기록 혼재 가능':'기존 시연 기록'};
}
function peerSummaries(){
const by={};for(const r of peers)(by[r.farm]??=[]).push(r);
return Object.entries(by).map(([farm,rs])=>({...rs[0],farm,n:rs.length,meanAdg:rs.reduce((s,r)=>s+r.adg,0)/rs.length,meanTemp:rs.reduce((s,r)=>s+r.temp,0)/rs.length,meanDmi:rs.reduce((s,r)=>s+r.dmi,0)/rs.length}));
}
function computeMatches(params){
const mine=currentFarm(),list=peerSummaries();
const total=params.wBreed+params.wMonth+params.wFeed+params.wTemp+params.wPhase||1;
return list.map(x=>{
const calc=[
[x.breed===params.farmBreed?1:0,params.wBreed],
[Math.max(0,1-Math.abs(x.month-Number(params.farmMonth))/18),params.wMonth],
[x.feed===params.farmFeed?1:0,params.wFeed],
[mine.temp===null?0.5:Math.max(0,1-Math.abs(x.meanTemp-mine.temp)/15),params.wTemp],
[x.phase===params.farmPhase?1:0,params.wPhase]
];
const score=Math.round(100*calc.reduce((a,[v,w])=>a+v*w,0)/total);
return {...x,score,adgGap:mine.grow===null?null:x.meanAdg-mine.grow};
}).sort((a,b)=>b.score-a.score||a.farm.localeCompare(b.farm));
}
function evidence(x,mine){
const parts=[];
if(x.feed!==modes.farmFeed)parts.push('사료 유형('+x.feed+') 차이');
if(x.phase!==modes.farmPhase)parts.push('비육 단계('+x.phase+') 차이');
if(mine.temp!==null&&Math.abs(x.meanTemp-mine.temp)>2)parts.push('평균 온도 차이');
if(x.meanAdg>0)parts.push('해당 가상 농장의 평균 ADG '+x.meanAdg.toFixed(2)+' kg/일');
return parts.slice(0,3).join(' · ')||'공통 조건을 유지하며 관측 데이터 추가 확보';
}
function peerPage(){
const mine=currentFarm(),items=matched||computeMatches(modes);
const options=(id,values,current)=>'<select id="'+id+'">'+values.map(v=>'<option value="'+esc3(v)+'" '+(v===String(current)?'selected':'')+'>'+esc3(v)+'</option>').join('')+'</select>';
return '<h2>농장 간 비교·추천 <span class="badge">가상 클라우드 실습</span></h2>'+
'<div class="v3-warning"><strong>가상 농장 비교 시뮬레이션</strong><div>현재 비교 데이터 480건·농장 12곳은 교육용으로 생성한 합성 데이터입니다. 외부 농장이나 클라우드 서버에서 수집한 정보가 아닙니다. 실제 사용하려면 <button class="subbtn" type="button" data-v3-page="'+GUIDE+'">내 데이터 연결·설명서</button>에서 본인 농장 기록을 등록해야 합니다. 실제 클라우드 공유와 AI 모델 학습은 아직 구현되지 않았습니다.</div></div>'+
'<div class="grid" style="margin:15px 0">'+[['가상 비교농장','12곳'],['합성 비교기록',peers.length+'건'],['내 농장 체중 기록',mine.n+'건'],['유사도 상위 농장',items[0]?.score+'점']].map(([a,b])=>'<div class="card" style="cursor:default"><div class="muted">'+a+'</div><div class="big">'+b+'</div></div>').join('')+'</div>'+
'<div class="layout"><div>'+
'<div class="panel"><h3>비교 조건 입력</h3><p class="v3-note">비교 조건은 농장주가 확인·수정합니다. 실제 입력 기록에 없는 품종·월령·사료 조건을 자동으로 추정하지 않습니다.</p>'+
'<div class="fields"><label class="field">품종'+options('v3breed',['한우','육우'],modes.farmBreed)+'</label><label class="field">성별'+options('v3sex',['거세우','암소'],modes.farmSex)+'</label>'+
'<label class="field">대표 월령<input id="v3month" type="number" min="1" max="100" value="'+modes.farmMonth+'"></label>'+
'<label class="field">주 사료'+options('v3feed',['TMR','배합사료'],modes.farmFeed)+'</label>'+
'<label class="field">비육 단계'+options('v3phase',['전기','중기','후기'],modes.farmPhase)+'</label></div>'+
'<button id="v3match" class="button">유사 농장 다시 찾기</button>'+
'<p class="v3-note">가중치: 품종 30 · 월령 30 · 사료 20 · 환경 온도 10 · 비육 단계 10. 성별은 현재 점수에 반영하지 않으며 차기 비교 기준 개선 대상입니다.</p></div>'+
'<div class="panel"><h3>우리 농장 관측 기초</h3>'+
'<p class="v3-note">체중 기록 '+mine.n+'건 · 최근 환경 온도 '+(mine.temp===null?'기록 없음':mine.temp.toFixed(1)+'℃')+' · 평균 ADG '+(mine.grow===null?'계산 불가':mine.grow.toFixed(2)+' kg/일')+'</p>'+
'<p class="v3-note">자료 출처: '+mine.source+'. 현재 실제/시연 데이터의 완전 분리 및 교차 농장 인증은 제공하지 않습니다.</p></div>'+
'</div><div><div class="panel"><h3>조건별 유사 농장 TOP 5</h3>'+
items.slice(0,5).map((x,i)=>'<div class="v3-match"><div style="display:flex;justify-content:space-between"><strong>'+(i+1)+'. '+esc3(x.farm)+'</strong><strong>'+x.score+' / 100</strong></div>'+
'<div class="v3-meter"><div style="width:'+x.score+'%"></div></div><div class="v3-note">'+esc3(x.breed)+' · '+esc3(x.sex)+' · '+x.month+'개월 · '+esc3(x.feed)+' · '+esc3(x.phase)+' · 40건</div>'+
'<div style="font-size:13px;margin-top:8px">평균 ADG '+x.meanAdg.toFixed(2)+' kg/일 · DMI '+x.meanDmi.toFixed(2)+' kg/일 · 온도 '+x.meanTemp.toFixed(1)+'℃</div>'+
'<p class="v3-note"><strong>점검 후보:</strong> '+esc3(evidence(x,mine))+'</p></div>').join('')+'</div>'+
'<div class="panel"><h3>권고 기능의 판단 원칙</h3><p class="v3-note">유사도는 조건 기반 단순 가중치 점수입니다. 성적이 높은 가상 농장을 찾더라도 해당 사료나 환경이 성적 향상의 원인임을 입증하지 않습니다. 실측 자료와 충분한 비교 대상이 없으면 권고가 아닌 ‘검토 후보’로 제시합니다.</p>'+
'<button type="button" class="button secondary" data-v3-page="통합 분석·보고서">기존 분석·보고서로 이동</button></div></div></div>';
}
function csvRows(text){
const out=[];let row=[],val='',q=false;
for(let i=0;i<text.length;i++){
const c=text[i],n=text[i+1];
if(c==='"'&&q&&n==='"'){val+='"';i++;continue}
if(c==='"'){q=!q;continue}
if(c===','&&!q){row.push(val);val='';continue}
if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(val);val='';if(row.some(x=>x.trim()))out.push(row);row=[];continue}
val+=c;
}
if(q)throw Error('CSV 따옴표가 닫히지 않았습니다.');
row.push(val);if(row.some(x=>x.trim()))out.push(row);
return out;
}
const importCats=['개체관리','환경관리','급이·급수','건강·복지 관리','탄소·메탄관리','출하관리','방역·질병 이력'];
function doImport(text,cat){
const lines=csvRows(text.replace(/^\uFEFF/,''));
if(lines.length<2)throw Error('첫 줄에 헤더, 그다음 줄에 데이터를 입력해 주세요.');
const headings=lines[0].map(x=>x.trim());const fields=schema[cat];
const missing=fields.filter(([k])=>!headings.includes(k)).map(x=>x[0]);
if(missing.length)throw Error('필수 CSV 열 누락: '+missing.join(', ')+'. 템플릿을 다운로드하세요.');
const numericKeys=new Set(['weight','rumination','feeding','activity','methane','dmi','temp','humidity','feed','leftover','water','target']);
let rejected=0, duplicates=0,accepted=[];
const existing=new Set((data[cat]||[]).map(r=>r.id+'|'+r.date+'|'+JSON.stringify(fields.map(([k])=>r[k]??null))));
for(const line of lines.slice(1)){
const entry={demo:false,source:'사용자 CSV'};
for(const [k] of fields){
const j=headings.indexOf(k),raw=(line[j]??'').trim();
if(numericKeys.has(k)){entry[k]=raw===''?null:Number(raw)}else entry[k]=raw;
}
if(!entry.id||!entry.date||! /^\d{4}-\d{2}-\d{2}$/.test(entry.date)||!Number.isFinite(new Date(entry.date).getTime()) ||
fields.some(([k])=>numericKeys.has(k)&&entry[k]!==null&&!Number.isFinite(entry[k]))){rejected++;continue}
const signature=entry.id+'|'+entry.date+'|'+JSON.stringify(fields.map(([k])=>entry[k]??null));
if(existing.has(signature)){duplicates++;continue}
existing.add(signature);accepted.push(entry);
}
if(accepted.length){data[cat].push(...accepted);persist();}
localStorage.setItem(key3(),JSON.stringify({category:cat,lastImportedAt:new Date().toLocaleString('ko-KR'),records:accepted.length}));
return {accepted:accepted.length,rejected,duplicates};
}
function saveCsv(filename,rows){
const t='\ufeff'+rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
const url=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function guidePage(){
const cat=importCats[0],status=(()=>{try{return JSON.parse(localStorage.getItem(key3()))}catch(e){return null}})();
return '<h2>내 데이터 연결·설명서</h2>'+
'<div class="v3-warning"><strong>현재는 가상 데이터 시연 단계입니다.</strong><div>본인 농장에서 실제 사용하려면 본인 데이터(개체·사료·환경·건강 기록)를 직접 등록하거나 CSV로 불러와 주세요. 가상 기록이 자동으로 실측 기록으로 바뀌지 않습니다. 브라우저에 저장한 데이터는 클라우드 공유되지 않으며, 기기 변경·브라우저 데이터 삭제 시 유실될 수 있습니다.</div></div>'+
'<div class="layout"><div><div class="panel"><h3>① 실제 기록 CSV 가져오기</h3>'+
'<label class="field">가져올 자료 항목<select id="v3ImportCat">'+importCats.map(n=>'<option>'+esc3(n)+'</option>').join('')+'</select></label>'+
'<div class="actionrow"><button type="button" class="button secondary" id="v3DownloadTemplate">선택 항목 CSV 템플릿</button></div>'+
'<label class="field">CSV 파일 선택 (UTF-8)<input type="file" accept=".csv,text/csv" id="v3ImportFile"></label>'+
'<button type="button" class="button" id="v3ImportSubmit">CSV 검증 후 추가 저장</button>'+
(importSummary?'<div class="result">'+esc3(importSummary)+'</div>':'')+
'<p class="v3-note">파일의 첫 줄은 영문 필드명이어야 하고, 날짜 형식은 YYYY-MM-DD입니다. 누락값은 빈칸으로 두며 0으로 대신하지 마세요. 완전히 같은 행은 중복 추가하지 않습니다. 기존 기록은 삭제하지 않습니다.</p>'+
(status?'<p class="v3-note">최근 가져오기: '+esc3(status.lastImportedAt)+' · '+esc3(status.category)+' · '+status.records+'건</p>':'')+'</div>'+
'<div class="panel"><h3>② 개별 입력 / 확인</h3><p class="v3-note">파일이 없다면 기존 개체관리·환경관리·급이급수 화면의 기록 입력 버튼을 이용할 수 있어요. 입력 후 날짜·개체번호·측정단위와 원본 출처를 확인하고 관측·품질센터에서 이상 기록을 검토하세요.</p>'+
'<div class="actionrow"><button class="button secondary" data-v3-page="개체관리">개체관리 열기</button><button class="button secondary" data-v3-page="관측·품질센터">품질 검사 열기</button></div></div></div>'+
'<div><div class="panel"><h3>실제 데이터 연결 순서</h3><ol class="v3-steps">'+[
'개체번호·측정일·단위를 확인하고 기존 농장 기록을 CSV로 준비합니다.',
'왼쪽에서 기록 종류를 선택하고 해당 템플릿을 받아 데이터 열 이름을 맞춥니다.',
'CSV를 선택한 다음 검증 후 추가 저장을 누릅니다.',
'개체관리·환경관리 등 기존 메뉴에서 입력된 실측 기록을 확인합니다.',
'관측·품질센터에서 결측·중복 의심·비정상값을 검토합니다.',
'통합 분석·보고서에서 관측 분석을 실행하고, 농장 간 비교에서는 현재 DEMO 비교군과 구분해서 해석합니다.',
'중요 데이터는 기존 메뉴 CSV 다운로드로 백업합니다.'
].map(s=>'<li>'+esc3(s)+'</li>').join('')+'</ol></div>'+
'<div class="panel"><h3>센서와 클라우드 연동의 한계</h3><p class="v3-note">현재 센서 메뉴는 5초 간격으로 자체 생성한 가상값만 보여줍니다. 실제 장비의 자동 수신을 사용하려면 장비 제조사의 API/통신 규격과 서버 연결이 추가로 필요합니다. 현재 GitHub Pages는 정적 웹사이트라 여러 농장의 비공개 정보를 안전하게 공유하는 서버 기능이 없습니다. 실제 공유 운영 전에는 별도 인증·권한·암호화·동의와 저장소 구축이 필요합니다.</p></div></div></div>';
}
function regroup(){
const nav=document.querySelector('header nav');if(!nav)return;
nav.className='v3-nav';nav.innerHTML=groups.map((g,i)=>{
const current=g.pages.includes(page);
if(g.pages.length===1)return '<button class="'+(current?'v3-current':'')+'" data-v3-page="'+esc3(g.pages[0])+'">'+esc3(g.label)+'</button>';
return '<details '+(current?'class="v3-active"':'')+'><summary class="'+(current?'v3-current':'')+'">'+esc3(g.label)+' ▾</summary><div class="v3-menu">'+g.pages.map(p=>'<button data-v3-page="'+esc3(p)+'">'+esc3(p)+'</button>').join('')+'</div></details>';
}).join('');
nav.querySelectorAll('[data-v3-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.v3Page)));
}
function go(dest){page=dest;query='';edit=-1;render();window.scrollTo(0,0)}
function banner(){
const main=document.querySelector('main');if(!main||main.querySelector('.v3-global-banner'))return;
const box=document.createElement('div');box.className='v3-warning v3-global-banner';box.innerHTML='<strong>교육용 DEMO 데이터가 포함되어 있습니다.</strong> 실제 농장 관리에 사용하기 전 본인 데이터를 입력하세요. <button type="button" class="subbtn" id="v3GuideShortcut">실제 데이터 연결 방법</button>';
main.insertBefore(box,main.firstChild);box.querySelector('button').addEventListener('click',()=>go(GUIDE));
}
function attachV3(){
document.querySelectorAll('[data-v3-page]').forEach(b=>{if(!b.closest('header'))b.addEventListener('click',()=>go(b.dataset.v3Page))});
document.getElementById('v3match')?.addEventListener('click',()=>{
const mon=Number(document.getElementById('v3month').value);if(!Number.isFinite(mon)||mon<1||mon>100){alert('월령은 1~100개월 범위로 입력하세요.');return}
modes.farmBreed=document.getElementById('v3breed').value;
modes.farmSex=document.getElementById('v3sex').value;
modes.farmFeed=document.getElementById('v3feed').value;
modes.farmPhase=document.getElementById('v3phase').value;
modes.farmMonth=String(mon);matched=computeMatches(modes);render();
});
document.getElementById('v3DownloadTemplate')?.addEventListener('click',()=>{
const cat=document.getElementById('v3ImportCat').value;
saveCsv('CattleCare_'+cat+'_template.csv',[schema[cat].map(x=>x[0])]);
});
document.getElementById('v3ImportSubmit')?.addEventListener('click',async()=>{
const file=document.getElementById('v3ImportFile')?.files?.[0],cat=document.getElementById('v3ImportCat').value;
if(!file){alert('CSV 파일을 먼저 선택하세요.');return}
if(file.size>3e6){alert('파일 크기는 3MB 이하로 제한됩니다.');return}
try{const text=await file.text();const result=doImport(text,cat);importSummary='저장 '+result.accepted+'건 / 유효성 검사 제외 '+result.rejected+'건 / 동일 행 중복 제외 '+result.duplicates+'건. 기존 시연 데이터는 유지되었습니다.';matched=null;render();}
catch(e){alert('가져오기 오류: '+String(e.message||e))}
});
}
const originalReportV3=report;
report=function(){return page===PEER?peerPage():page===GUIDE?guidePage():originalReportV3()};
const originalRenderV3=render;
render=function(){originalRenderV3();regroup();banner();attachV3()};
render();
})();