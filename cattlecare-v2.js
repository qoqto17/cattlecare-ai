/* CattleCare AI v2: additive demo sensor, dual-domain analytics, commands, reports */
(function(){
'use strict';
const P_SENSOR='센서 시뮬레이션',P_REPORT='통합 분석·보고서';
[P_SENSOR,P_REPORT].forEach(n=>{if(!names.includes(n))names.push(n)});
const K=()=>scopedKey('sensor-sim-v2');
const CK=()=>scopedKey('farm-command-v2');
const QK=()=>scopedKey('sensor-settings-v2');
const $=id=>document.getElementById(id);
const clean=v=>esc(String(v??''));
const numeric=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const valid=(n,min,max)=>numeric(n)&&Number(n)>=min&&Number(n)<=max;
const clock=()=>new Date().toLocaleString('sv-SE').replace(' ','T');
const ymd=()=>new Date().toLocaleDateString('sv-SE');
const read=(key,fallback)=>{try{let a=JSON.parse(localStorage.getItem(key));return a??fallback}catch(e){return fallback}};
const settings=()=>({...{tempLimit:29,humidityLimit:80,waterDrop:30,adgFloor:0},...read(QK(),{})});
let readings=read(K(),[]);if(!Array.isArray(readings))readings=[];
let tick=null,cmdText='',reportMode='daily',reportCow='C001',reportDay=ymd(),lastOutput='';
const store=()=>localStorage.setItem(K(),JSON.stringify(readings.slice(-600)));
const measured=()=>Object.values(data).flat().filter(x=>!x.demo).length;
const nfmt=(n,places=1)=>numeric(n)?Number(n).toLocaleString('ko-KR',{maximumFractionDigits:places,minimumFractionDigits:0}):'미기록';
const rowQuality=r=>r.status==='OK'?'관측 (DEMO)':r.status==='MISS'?'미수신 (DEMO)':'센서 오류 (DEMO)';
const headerNotes='<p class="muted">교육용 센서 시뮬레이션 · 실제 IoT 수신/실제 자동 제어가 아닙니다. 데이터는 이 브라우저의 현재 프로필에만 저장됩니다. 실제 측정과 예측은 구분합니다.</p>';
function settingForm(){
const s=settings();return '<div class="fields">'+[['tempLimit','온도 경고 기준 (℃)',s.tempLimit],['humidityLimit','습도 경고 기준 (%)',s.humidityLimit],['waterDrop','음수 계량 변화 경고 (%)',s.waterDrop],['adgFloor','ADG 확인 기준 (kg/일)',s.adgFloor]].map(([k,l,v])=>'<label class="field">'+l+'<input type="number" step="any" id="set-'+k+'" value="'+clean(v)+'"></label>').join('')+'</div><button type="button" class="button secondary" id="saveSensorSettings">경고 기준 저장</button>';
}
function generateOne(){
const s=settings(), counter=readings.length+1;
const now=clock(),created=[];
['A동','B동'].forEach((barn,j)=>{
const phase=counter*.39+j*1.7,missing=counter%17===0&&j===0,err=counter%31===0&&j===1;
const temp=missing||err?null:+(25.5+j*1.2+Math.sin(phase)*3.9).toFixed(1);
const humidity=missing||err?null:Math.min(100,Math.max(0,Math.round(67+j*3+Math.cos(phase*.8)*15)));
const water=missing||err?null:Math.max(0,Math.round(125+j*12+Math.sin(phase*.9)*45));
created.push({sensor:'ENV-'+(j+1),barn,recordedAt:now,seq:counter,temp,humidity,waterMeter:water,status:missing?'MISS':err?'ERR':'OK',demo:true,source:'simulation'});
});
readings.push(...created);readings=readings.slice(-600);store();return created;
}
function alertList(){
const s=settings(),out=[];
const recent={};readings.forEach(r=>{recent[r.barn]=r});
Object.values(recent).forEach(r=>{
if(r.status!=='OK'){out.push({key:'signal|'+r.barn,where:r.barn,kind:'센서 품질',message:rowQuality(r)+' — 환경/음수 수치를 0으로 계산하지 않음',time:r.recordedAt});return}
if(numeric(r.temp)&&Number(r.temp)>s.tempLimit)out.push({key:'temp|'+r.barn,where:r.barn,kind:'환경',message:'온도 '+nfmt(r.temp)+'℃, 설정 기준 '+s.tempLimit+'℃ 초과',time:r.recordedAt});
if(numeric(r.humidity)&&Number(r.humidity)>s.humidityLimit)out.push({key:'humidity|'+r.barn,where:r.barn,kind:'환경',message:'습도 '+nfmt(r.humidity,0)+'%, 설정 기준 '+s.humidityLimit+'% 초과',time:r.recordedAt});
const previous=readings.filter(x=>x.barn===r.barn&&x.recordedAt!==r.recordedAt&&x.status==='OK'&&numeric(x.waterMeter)).at(-1);
if(previous&&Number(previous.waterMeter)>0&&numeric(r.waterMeter)){
const pct=(Number(r.waterMeter)-Number(previous.waterMeter))/Number(previous.waterMeter)*100;
if(pct<=-s.waterDrop)out.push({key:'water|'+r.barn,where:r.barn,kind:'급수 계량',message:'직전 유효값 대비 계량 사용량 '+nfmt(pct)+'% 변화. 실제 음수량이 아닌 계량값',time:r.recordedAt});
}
});
const grouped={};(data['개체관리']||[]).filter(r=>r.date&&numeric(r.weight)).forEach(r=>(grouped[r.id]??=[]).push(r));
Object.entries(grouped).forEach(([id,rs])=>{
rs.sort((a,b)=>a.date.localeCompare(b.date));const a=rs.at(-2),b=rs.at(-1);if(!a||!b||a.date===b.date)return;
const days=(new Date(b.date)-new Date(a.date))/86400000;
if(days>0){const adg=(Number(b.weight)-Number(a.weight))/days;if(adg<s.adgFloor)out.push({key:'growth|'+id,where:id,kind:'체중',message:'최근 관측 ADG '+nfmt(adg,2)+' kg/일, 설정 기준 미만'+(a.demo||b.demo?' (DEMO)':''),time:b.date})}
});
return out;
}
function latestSummary(){
const last={};readings.forEach(x=>last[x.barn]=x);
const alerts=alertList();
return '<div class="grid" style="margin:14px 0">'+[
['시연 센서 수집',readings.length+'건'],['실제 입력 기록',measured()+'건'],['현재 센서 경고',alerts.filter(x=>x.kind!=='체중').length+'건'],['성장 점검 항목',alerts.filter(x=>x.kind==='체중').length+'건']
].map(([x,y])=>'<div class="card" style="cursor:default"><div class="muted">'+x+'</div><div class="big">'+y+'</div></div>').join('')+'</div>'+
'<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+['A동','B동'].map(b=>{const r=last[b];return '<div class="panel"><h3>'+b+' 센서</h3><div class="big">'+(r?.status==='OK'?nfmt(r.temp)+'℃':'미수신')+'</div><p class="muted">습도 '+(r?.status==='OK'?nfmt(r.humidity,0)+'%':'미확인')+' · 급수 계량 '+(r?.status==='OK'?nfmt(r.waterMeter,0)+' L/주기':'미확인')+'</p><p class="muted">수집 '+clean(r?.recordedAt||'기록 없음')+' · '+clean(r?rowQuality(r):'미수집')+'</p></div>'}).join('')+'</div>';
}
function sensorPage(){
return '<h2>센서 자동 수집 시뮬레이션 <span class="badge">DEMO</span></h2>'+headerNotes+
'<div class="panel"><div class="actionrow"><button class="button" id="sensorOnce">센서 1회 수집</button><button class="button secondary" id="sensorAuto">'+(tick?'자동 수집 중지':'자동 수집 시작 (5초 간격)')+'</button><button class="button secondary" id="sensorClear">시연 센서 기록 초기화</button></div><p class="muted">A동·B동의 온도, 습도 및 급수 계량값을 각각 수집합니다. 데모 센서의 미수신과 오류를 별도 상태로 생성합니다. 최대 600건 보관하며 다른 페이지로 이동하면 자동 수집을 중지합니다.</p></div>'+
latestSummary()+
'<div class="layout"><div><div class="panel"><h3>경고 기준 설정</h3>'+settingForm()+'</div>'+
'<div class="panel"><h3>실측과 시뮬레이션 구분</h3><p class="muted">본 화면의 센서값은 모두 시뮬레이션입니다. 기존 개체관리 입력 기록은 별도의 사용자가 입력한 데이터입니다. 미수신은 0이 아니며, 계량값을 개체의 실제 음수량으로 단정하지 않습니다.</p></div></div>'+
'<div><div class="panel"><h3>자동 경고 · 현장 확인</h3>'+alertTable(12)+'</div>'+
'<div class="panel"><h3>최근 센서 수집 내역</h3>'+recentTable()+'</div></div></div>';
}
function alertTable(limit=30){
const alerts=alertList();
return alerts.length?'<div class="table"><table><thead><tr><th>구분</th><th>대상</th><th>내용</th><th>업무</th></tr></thead><tbody>'+
alerts.slice(-limit).reverse().map((a,i)=>'<tr><td>'+clean(a.kind)+'</td><td>'+clean(a.where)+'</td><td style="white-space:normal;min-width:175px">'+clean(a.message)+'</td><td><button class="subbtn" data-task-key="'+clean(a.key)+'">점검 생성</button></td></tr>').join('')+'</tbody></table></div>':'<p class="muted">현재 설정된 규칙에서 탐지된 경고가 없습니다. 정상 상태를 확정하는 것은 아닙니다.</p>';
}
function recentTable(){
return '<div class="table" style="max-height:300px;overflow:auto"><table><tr><th>수집시각</th><th>우사</th><th>온도</th><th>습도</th><th>계량량</th><th>상태</th></tr>'+
readings.slice(-24).reverse().map(r=>'<tr><td>'+clean(r.recordedAt)+'</td><td>'+clean(r.barn)+'</td><td>'+(r.status==='OK'?nfmt(r.temp)+'℃':'—')+'</td><td>'+(r.status==='OK'?nfmt(r.humidity,0)+'%':'—')+'</td><td>'+(r.status==='OK'?nfmt(r.waterMeter,0)+' L':'—')+'</td><td>'+clean(rowQuality(r))+'</td></tr>').join('')+'</table></div>';
}
function tasksForAlert(key){
const a=alertList().find(x=>x.key===key);if(!a){alert('해당 경고가 더 이상 유효하지 않습니다.');return}
const dedup=(data['작업명령']||[]).find(t=>t.alertKey===key&&['승인대기','승인'].includes(t.status));
if(dedup){alert('이미 진행 중인 동일 점검이 있습니다.');return}
const now=clock();data['작업명령'].push({id:'W'+Date.now().toString().slice(-9),date:ymd(),target:a.where,task:'['+a.kind+'] '+a.message+' — 현장 확인',status:'승인대기',alertKey:key,createdAt:now,demo:true});
persist();addRecent(a.where+' 점검 업무 생성','작업');alert('기존 작업명령 메뉴에 승인대기 업무를 생성했습니다.');
render();
}
function weights(){
const grouped={};(data['개체관리']||[]).filter(r=>r.date&&numeric(r.weight)).forEach(r=>(grouped[r.id]??=[]).push(r));
return Object.entries(grouped).map(([id,arr])=>{
arr.sort((a,b)=>a.date.localeCompare(b.date));const latest=arr.at(-1),prev=arr.at(-2),dt=prev?(new Date(latest.date)-new Date(prev.date))/86400000:0,ok=dt>0&&prev.weight>0;
return {id,latest:latest.weight,date:latest.date,adg:ok?(latest.weight-prev.weight)/dt:null,delta:ok?(latest.weight-prev.weight):null,days:dt,source:latest.demo?'DEMO':'수기 입력',rows:arr};
}).sort((a,b)=>a.id.localeCompare(b.id));
}
function reportContent(mode,cow,day){
const selected=weights(),alerts=alertList();
const all=readings.filter(r=>r.recordedAt.slice(0,10)===day);
const cov=all.length?all:readings.slice(-20);
let heading='',content='';
const item=(label,value)=>'<div style="padding:7px 0;border-bottom:1px solid #e1eae1"><strong>'+clean(label)+'</strong>: '+clean(value)+'</div>';
if(mode==='daily'){
heading='일별 운영보고서 · '+day;
content=item('선택일 센서 수집(시뮬레이션)',all.length+'건')+item('선택일 센서 오류/미수신',all.filter(x=>x.status!=='OK').length+'건')+
item('해당일 체중 기록',(data['개체관리']||[]).filter(r=>r.date===day).length+'건')+
item('해당일 작업명령',(data['작업명령']||[]).filter(r=>r.date===day).length+'건')+
item('선택일 평균 온도',(()=>{let xs=all.filter(x=>x.status==='OK'&&numeric(x.temp));return xs.length?nfmt(xs.reduce((s,r)=>s+Number(r.temp),0)/xs.length)+'℃':'미측정'})());
}else if(mode==='animal'){
heading='개체별 성장보고서 · '+cow;const a=selected.find(x=>x.id===cow);
content=a?item('최근 측정일',a.date)+item('최근 체중',nfmt(a.latest)+' kg')+
item('최신 두 측정일 간 체중 변화',a.delta===null?'비교 자료 부족':nfmt(a.delta)+' kg')+
item('최근 ADG',a.adg===null?'계산 불가':nfmt(a.adg,2)+' kg/일')+
item('기록 수',a.rows.length+'건')+item('마지막 체중 출처',a.source):
'<p>이 개체의 유효한 체중 기록이 없습니다.</p>';
}else{
heading='농장 종합 운영보고서';
const vals=cov.filter(r=>r.status==='OK'&&numeric(r.temp));
const adgs=selected.filter(x=>numeric(x.adg));
content=item('등록 개체',new Set((data['개체관리']||[]).map(x=>x.id)).size+'두')+
item('유효 체중 기록 개체',selected.length+'두')+item('평균 최신 체중',selected.length?nfmt(selected.reduce((s,x)=>s+Number(x.latest),0)/selected.length)+' kg':'계산 불가')+
item('ADG 계산 가능 개체',adgs.length+'두')+
item('계산 가능 개체 평균 ADG',adgs.length?nfmt(adgs.reduce((s,x)=>s+Number(x.adg),0)/adgs.length,2)+' kg/일':'계산 불가')+
item('최근 센서 수집',readings.length+'건 (전부 DEMO)')+
item('최근 유효 환경 기록 평균 온도',vals.length?nfmt(vals.reduce((s,x)=>s+Number(x.temp),0)/vals.length)+'℃':'시연 센서 기록 없음')+
item('확인 필요 알림',alerts.length+'건')+
item('관리 작업명령',(data['작업명령']||[]).length+'건');
}
return {heading,content,plain:heading+' | '+content.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()};
}
function analysisReport(){
const cows=weights(),r=reportContent(reportMode,reportCow,reportDay);
return '<h2>통합 분석·보고서 <span class="badge">관측 · 분석 · 후속확인</span></h2>'+headerNotes+latestSummary()+
'<div class="layout"><div><div class="panel"><h3>AI 명령 센터 · 규칙 기반 실행</h3><p class="muted">저장된 관측 데이터에 연결된 명령만 실행합니다. 학습형 생성 AI와 연결된 기능은 아닙니다.</p>'+
'<form id="farmCommand"><label class="field">농장 관리 명령<input id="farmCommandText" placeholder="예: 이상 감지 / 오늘 보고서 / C003 체중 / 점검 생성" value="'+clean(cmdText)+'"></label><button class="button">명령 실행</button></form>'+
'<div class="actionrow">'+['이상 감지','성장 분석','환경 분석','오늘 보고서','점검 생성'].map(q=>'<button type="button" class="subbtn" data-command-example="'+clean(q)+'">'+q+'</button>').join('')+'</div>'+
(lastOutput?'<div class="result">'+clean(lastOutput)+'</div>':'')+'</div>'+
'<div class="panel"><h3>성장·생산성 관측 분석</h3><div class="table" style="max-height:320px;overflow:auto"><table><tr><th>개체</th><th>최근 체중</th><th>ADG</th><th>출처</th></tr>'+
cows.map(r=>'<tr><td>'+clean(r.id)+'</td><td>'+nfmt(r.latest)+' kg</td><td>'+(r.adg===null?'산출 불가':nfmt(r.adg,2)+' kg/일')+'</td><td>'+r.source+'</td></tr>').join('')+'</table></div></div></div>'+
'<div><div class="panel"><h3>환경·급수 관측 및 경고</h3>'+alertTable(16)+'</div>'+
'<div class="panel" id="report-panel"><h3>보고서 유형 선택</h3><div class="actionrow">'+[['daily','일별'],['animal','개체별'],['farm','종합']].map(([k,v])=>'<button type="button" class="subbtn" data-report-type="'+k+'" style="'+(reportMode===k?'border-color:#006400;color:#006400;font-weight:800':'')+'">'+v+' 보고서</button>').join('')+'</div>'+
(reportMode==='daily'?'<label class="field">기준 날짜<input id="reportDay" type="date" value="'+clean(reportDay)+'"></label>':'')+
(reportMode==='animal'?'<label class="field">개체 선택<select id="reportCow">'+cows.map(c=>'<option value="'+clean(c.id)+'" '+(c.id===reportCow?'selected':'')+'>'+clean(c.id)+'</option>').join('')+'</select></label>':'')+
'<div id="reportPreview" class="result" style="background:white;color:#173143;border-color:#cbd9cf"><h3>'+clean(r.heading)+'</h3><p class="muted">보고서 생성일 '+ymd()+' · 관측/DEMO 구분 유지 · 미기록은 0 아님</p>'+r.content+'<p class="muted">설정 기준에 따른 참고용 분석입니다. 실측 관측값, 시연 센서 데이터, 계산 결과를 혼용하지 마세요.</p></div>'+
'<div class="actionrow"><button id="exportReportCsv" class="button">보고서 CSV</button><button id="exportReportPrint" class="button secondary">인쇄·PDF 저장</button></div></div></div></div>';
}
function executeCmd(q){
const text=q.trim(),ids=weights();if(!text){lastOutput='명령을 입력해 주세요.';return}
cmdText=text;addRecent(text,'AI 명령');
if(/점검|업무|작업/.test(text)&&/생성|등록|추가/.test(text)){
 const alert=alertList()[0];if(alert){tasksForAlert(alert.key);lastOutput='첫 번째 확인 필요 항목에 대한 업무 생성 요청을 처리했습니다. 작업명령 메뉴에서 확인하세요.'}
 else lastOutput='현재 경고 목록에 점검 대상으로 등록할 항목이 없습니다.';
}else if(/보고서|리포트/.test(text)){
 reportMode=/개체/.test(text)?'animal':/종합|전체|농장/.test(text)?'farm':'daily';
 lastOutput='선택한 보고서 미리보기를 아래에 표시합니다. CSV 또는 PDF로 출력할 수 있습니다.';
}else if(/이상|경고|알림/.test(text)){
 const a=alertList();lastOutput=a.length?'현재 기준의 확인 필요 항목 '+a.length+'건: '+a.slice(0,5).map(x=>x.where+'('+x.kind+')').join(', '):'현재 규칙에 따라 탐지된 경고가 없습니다. 정상 확정을 뜻하지 않습니다.';
}else if(/환경|온도|습도|환기|급수|음수/.test(text)){
 const a=readings.filter(x=>x.status==='OK'),b=a.at(-1);
 lastOutput=b?'최근 관측(시뮬레이션): '+b.barn+' '+nfmt(b.temp)+'℃ / '+nfmt(b.humidity,0)+'% / 계량 '+nfmt(b.waterMeter,0)+' L. 실제 음수량 아님.':'센서 기록이 없습니다. 센서 시뮬레이션에서 먼저 수집해 주세요.';
}else if(/성장|ADG|체중|증체/.test(text)){
 const m=text.match(/C0*\d{1,3}/i),id=m?'C'+String(parseInt(m[0].slice(1),10)).padStart(3,'0'):null,x=id?ids.find(r=>r.id===id):null;
 if(id)lastOutput=x?x.id+' 최근 체중 '+nfmt(x.latest)+' kg / ADG '+(x.adg===null?'계산 불가':nfmt(x.adg,2)+' kg/일')+' / '+x.source:id+' 관측값이 없습니다.';
 else{const a=ids.filter(x=>numeric(x.adg));lastOutput='ADG 계산 가능 '+a.length+'두. '+(a.length?'평균 '+nfmt(a.reduce((s,x)=>s+x.adg,0)/a.length,2)+' kg/일':'기록 부족');}
}else{
 lastOutput='지원되는 명령: 이상 감지, 환경 분석, 성장 분석, C003 체중, 오늘 보고서, 종합 보고서, 점검 생성. 자동 생성형 AI 답변은 제공하지 않습니다.';
}
}
function csvExport(filename,rows){
const text='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
const u=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
const a=document.createElement('a');a.href=u;a.download=filename;a.click();URL.revokeObjectURL(u);
}
function attach(){
if(page===P_SENSOR){
$('sensorOnce')?.addEventListener('click',()=>{generateOne();render()});
$('sensorAuto')?.addEventListener('click',()=>{if(tick){clearInterval(tick);tick=null;render()}else{generateOne();tick=setInterval(()=>{if(page!==P_SENSOR){clearInterval(tick);tick=null;return}generateOne();render()},5000);render()}});
$('sensorClear')?.addEventListener('click',()=>{if(confirm('센서 시뮬레이션 기록만 초기화할까요? 기존 개체·우사 기록은 유지됩니다.')){readings=[];store();render()}});
$('saveSensorSettings')?.addEventListener('click',()=>{
 const s={};for(const k of ['tempLimit','humidityLimit','waterDrop','adgFloor'])s[k]=Number($('set-'+k).value);
 if(!valid(s.tempLimit,-40,60)||!valid(s.humidityLimit,0,100)||!valid(s.waterDrop,0,100)||!valid(s.adgFloor,-10,10)){alert('온도 -40~60℃, 습도 0~100%, 감소율 0~100%, ADG -10~10 범위로 설정해 주세요.');return}
 localStorage.setItem(QK(),JSON.stringify(s));render();
});
}
if(page===P_REPORT){
$('farmCommand')?.addEventListener('submit',e=>{e.preventDefault();executeCmd($('farmCommandText').value);render()});
document.querySelectorAll('[data-command-example]').forEach(b=>b.addEventListener('click',()=>{executeCmd(b.dataset.commandExample);render()}));
document.querySelectorAll('[data-report-type]').forEach(b=>b.addEventListener('click',()=>{reportMode=b.dataset.reportType;render()}));
$('reportCow')?.addEventListener('change',e=>{reportCow=e.target.value;render()});
$('reportDay')?.addEventListener('change',e=>{reportDay=e.target.value;render()});
$('exportReportCsv')?.addEventListener('click',()=>{
 const r=reportContent(reportMode,reportCow,reportDay),doc=new DOMParser().parseFromString(r.content,'text/html'),parts=[...doc.querySelectorAll('div')].map(x=>x.textContent.split(': '));
 csvExport('CattleCare_'+reportMode+'_'+ymd()+'.csv',[['보고서',r.heading],['작성일',ymd()],['자료구분','시연 센서 데이터는 DEMO'],...parts.map(x=>[x[0],x.slice(1).join(': ')])]);
});
$('exportReportPrint')?.addEventListener('click',()=>{
 const html=$('reportPreview')?.innerHTML||'';
 const w=window.open('','_blank');
 if(!w){alert('팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.');return}
 w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CattleCare 보고서</title><style>body{font:14px/1.7 system-ui,sans-serif;padding:28px;color:#173143}h3{color:#006400}.muted{color:#68786c}@media print{body{padding:8px}}</style></head><body>'+html+'</body></html>');
 w.document.close();w.focus();w.print();
});
}
if(page===P_SENSOR||page===P_REPORT){
 document.querySelectorAll('[data-task-key]').forEach(b=>b.addEventListener('click',()=>tasksForAlert(b.dataset.taskKey)));
}
}
const baseReport=report;
report=function(){return page===P_SENSOR?sensorPage():page===P_REPORT?analysisReport():baseReport()};
const baseBind=bind;
bind=function(){baseBind();attach()};
const baseRender=render;
render=function(){
 if(page!==P_SENSOR&&tick){clearInterval(tick);tick=null}
 // Re-read on account switch, preserving profile-level storage.
 const current=K();if(render._profile!==current){render._profile=current;readings=read(K(),[]);if(!Array.isArray(readings))readings=[];lastOutput='';cmdText=''}
 baseRender();
};
const baseParse=parse;
parse=function(q){
 if(/보고서|성장 분석|환경 분석|이상 감지|점검 생성|C0*\d+.*체중/.test(q)){
 page=P_REPORT;executeCmd(q);render();scrollTo(0,0);
 }else baseParse(q);
};
render();
})();