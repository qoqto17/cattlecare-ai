/* CattleCare AI — additive observation & data-quality extension.
   Keeps all original menus, records, reports, NEWS and theme untouched. */
(function () {
  'use strict';
  const menu = '관측·품질센터';
  if (!names.includes(menu)) names.push(menu);
  const defaultOrders = '미기록은 실제 0으로 처리하지 않는다.\n관측값·계산값·예측값·시연자료를 구분한다.\n이상값은 삭제하지 않고 검토 대상으로 표시한다.\n각 결과에 개체·측정일·단위를 표시한다.';
  const orderKey = () => scopedKey('standing-orders');
  const safe = v => esc(String(v ?? ''));
  const num = v => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));
  const categories = ['개체관리','환경관리','급이·급수','건강·복지 관리','탄소·메탄관리','출하관리','방역·질병 이력'];
  const issues = () => {
    const out = [], seen = new Set();
    categories.forEach(cat => (data[cat] || []).forEach((r, i) => {
      const tag = cat+' / '+(r.id || '대상 미기록')+' / '+(r.date || '날짜 미기록');
      if (!r.id || !r.date) out.push({tag,reason:'대상 또는 측정일 미기록',type:'결측'});
      const k = cat+'|'+r.id+'|'+r.date;
      if (seen.has(k)) out.push({tag,reason:'동일 대상·날짜에 여러 기록 존재 (재측정 여부 확인)',type:'중복 의심'});
      seen.add(k);
      for (const [field,label] of schema[cat]) {
        if (r[field] === '' || r[field] === null || r[field] === undefined) out.push({tag,reason:label+' 미기록 (0 아님)',type:'결측'});
      }
      if (cat === '급이·급수' && num(r.feed) && num(r.leftover) && +r.leftover > +r.feed)
        out.push({tag,reason:'사료 잔량이 공급량 초과',type:'값 검토'});
      if (cat === '환경관리' && num(r.humidity) && (+r.humidity < 0 || +r.humidity > 100))
        out.push({tag,reason:'상대습도 0~100% 범위 외',type:'값 검토'});
      if (cat === '개체관리' && num(r.weight) && +r.weight <= 0)
        out.push({tag,reason:'체중이 0 이하',type:'값 검토'});
      if (['환경관리','급이·급수','건강·복지 관리','탄소·메탄관리'].includes(cat)) {
        const fields = { '환경관리':['temp','humidity'], '급이·급수':['feed','leftover','water'],
          '건강·복지 관리':['rumination','feeding','activity'], '탄소·메탄관리':['methane','dmi'] }[cat];
        fields.forEach(f => { if (num(r[f]) && +r[f] < 0) out.push({tag,reason:f+' 음수 기록',type:'값 검토'}); });
      }
    }));
    return out;
  };
  const stats = () => {
    const weight = (data['개체관리'] || []).filter(r => num(r.weight) && r.date).sort((a,b)=>a.date.localeCompare(b.date));
    const byId = {};
    weight.forEach(r => (byId[r.id] ||= []).push(r));
    const changes = Object.entries(byId).map(([id, rows]) => {
      const a=rows.at(-2), b=rows.at(-1);
      if (!a || !b || a.date === b.date || !num(a.weight) || !num(b.weight)) return null;
      const days=(new Date(b.date)-new Date(a.date))/86400000;
      if (!(days>0) || !(+a.weight>0)) return null;
      return {id,days,delta:+b.weight-(+a.weight),adg:(+b.weight-(+a.weight))/days,pct:(+b.weight-(+a.weight))/(+a.weight)*100,latest:b.date,demo:!!(a.demo||b.demo)};
    }).filter(Boolean).sort((a,b)=>a.adg-b.adg);
    return changes;
  };
  function center() {
    const all = Object.values(data).reduce((n,rows)=>n+(Array.isArray(rows)?rows.length:0),0);
    const flagged=issues(), changes=stats(), demo=Object.values(data).flat().filter(r=>r.demo).length;
    const kinds = {결측:flagged.filter(x=>x.type==='결측').length,'중복 의심':flagged.filter(x=>x.type==='중복 의심').length,'값 검토':flagged.filter(x=>x.type==='값 검토').length};
    const orders=localStorage.getItem(orderKey()) ?? defaultOrders;
    return '<h2>관측·품질센터 <span class="badge">관측 우선</span></h2>'+
      '<p class="muted">기존 관리 메뉴의 입력·저장 기능과 연결됩니다. 원본 기록을 삭제하지 않고 결측·중복 의심·값 검토 항목을 분리합니다. 통계는 규칙 기반이며 학습된 AI 예측이 아닙니다.</p>'+
      '<div class="grid" style="margin:16px 0">'+
      [['전체 기록',all+'건'],['시연 기록',demo+'건'],['결측 항목',kinds['결측']+'건'],['품질 검토', (kinds['중복 의심']+kinds['값 검토'])+'건']].map(x=>'<div class="card" style="cursor:default"><div class="muted">'+x[0]+'</div><div class="big">'+x[1]+'</div></div>').join('')+'</div>'+
      '<div class="layout"><div>'+
      '<div class="panel"><h3>관측·데이터 입력 바로가기</h3><p class="muted">기존 입력 양식을 유지합니다. 각 메뉴에서 기록 저장·수정·CSV 내보내기가 가능합니다.</p>'+
      '<div class="actionrow">'+['개체관리','환경관리','급이·급수','건강·복지 관리'].map(x=>'<button class="button secondary" type="button" data-observe="'+safe(x)+'">'+safe(x)+'</button>').join('')+'</div>'+
      '<h3>상설 오더 · 운영 대원칙</h3><label class="field">항상 적용할 데이터 처리 규칙<textarea id="qualityOrders" rows="6" style="padding:10px;border:1px solid #bfd2c3;border-radius:9px;width:100%;font:inherit">'+safe(orders)+'</textarea></label>'+
      '<div class="actionrow"><button class="button" id="saveQualityOrders">오더 저장</button><button class="button secondary" id="restoreQualityOrders">기본값</button></div>'+
      '<p class="muted">이 오더는 현재 브라우저의 프로필에 저장되는 관리 지침입니다. 외부 생성형 AI에 자동 전송되지는 않습니다.</p></div>'+
      '<div class="panel"><h3>분석 기준 및 출력</h3><p class="muted">동일 개체의 서로 다른 측정일 체중 기록으로 ADG를 계산합니다. 관측이 부족하거나 불가능한 경우 산출하지 않습니다.</p>'+
      '<button class="button" id="qualityCsv">검토 목록 CSV 출력</button> <button class="button secondary" id="qualityPrint">화면 인쇄·PDF 저장</button></div>'+
      '</div><div>'+
      '<div class="panel"><h3>최근 체중 변화 · 관측 기반</h3>'+
      (changes.length?'<div class="table"><table><thead><tr><th>개체</th><th>관측 기간</th><th>증감</th><th>ADG</th><th>변화율</th><th>구분</th></tr></thead><tbody>'+
      changes.slice(0,20).map(x=>'<tr><td>'+safe(x.id)+'</td><td>'+x.days+'일</td><td>'+fmt(x.delta)+' kg</td><td>'+fmt(x.adg)+' kg/일</td><td>'+fmt(x.pct)+'%</td><td>'+(x.demo?'DEMO':'실제 입력')+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted">비교 가능한 체중 관측값이 없습니다.</p>')+
      '<p class="muted">체중 변화는 질병 또는 출하 적기를 확정하지 않습니다. 동일 날짜의 재측정 기록은 품질 확인이 필요합니다.</p></div>'+
      '<div class="panel"><h3>데이터 품질 점검 <span class="badge">'+flagged.length+'건</span></h3>'+
      (flagged.length?'<div class="table" style="max-height:360px;overflow:auto"><table><thead><tr><th>구분</th><th>기록</th><th>확인 사항</th></tr></thead><tbody>'+
      flagged.slice(0,80).map(x=>'<tr><td>'+safe(x.type)+'</td><td>'+safe(x.tag)+'</td><td>'+safe(x.reason)+'</td></tr>').join('')+'</tbody></table></div><p class="muted">화면에는 최대 80개 표시하며 전체 목록은 CSV로 출력합니다.</p>':'<p class="muted">현재 검사 규칙에서 탐지된 항목이 없습니다. 모든 데이터가 정확하다는 의미는 아닙니다.</p>')+
      '</div></div></div>';
  }
  const originalReport = report;
  report = function () { return page===menu ? center() : originalReport(); };
  const originalBind = bind;
  bind = function () {
    originalBind();
    if (page!==menu) return;
    document.querySelectorAll('[data-observe]').forEach(b=>b.addEventListener('click',()=>{page=b.dataset.observe;query='';render();scrollTo(0,0)}));
    document.getElementById('saveQualityOrders')?.addEventListener('click',()=>{
      localStorage.setItem(orderKey(),document.getElementById('qualityOrders').value);alert('상설 오더를 이 브라우저에 저장했습니다.');
    });
    document.getElementById('restoreQualityOrders')?.addEventListener('click',()=>{
      document.getElementById('qualityOrders').value=defaultOrders;
      localStorage.setItem(orderKey(),defaultOrders);
    });
    document.getElementById('qualityCsv')?.addEventListener('click',()=>{
      const lines=['구분,기록,확인 사항',...issues().map(x=>[x.type,x.tag,x.reason].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))];
      const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='CattleCare_데이터품질_'+today()+'.csv';a.click();URL.revokeObjectURL(url);
    });
    document.getElementById('qualityPrint')?.addEventListener('click',()=>window.print());
  };
  render();
})();
