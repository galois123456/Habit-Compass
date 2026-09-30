import './style.css';
import { configured,supabase,loadAll,addDay,replaceDay,saveItem,updateActive } from './data.js';
import { todayKST,shiftDay,dayRange,startDay,rowsByDay,completed,streak,formatNumber,summarize,chartBuckets } from './logic.js';

const root=document.querySelector('#app');
const state={user:null,data:null,tab:'today',period:'30',chartItem:'',recordPeriod:'30',theme:localStorage.getItem('habit_theme')||'light',authMode:'login',busy:false,editDay:null,viewArchived:false};
const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const setTheme=()=>{
  document.documentElement.dataset.theme=state.theme;
  document.querySelector('meta[name="theme-color"]').content=state.theme==='dark'?'#101c19':'#f6f8f5';
};
const errorText=e=>{
  if(e?.code==='23505') return '같은 이름의 항목이 이미 있습니다.';
  if(e?.code==='42P01'||e?.code==='PGRST202') return '데이터베이스 표 또는 함수가 없습니다. README의 SQL 설치 단계를 확인하세요.';
  return e?.message||String(e);
};
function toast(message,bad=false){
  let node=document.querySelector('#toast');
  if(!node){node=document.createElement('div');node.id='toast';document.body.append(node);}
  node.textContent=message;node.className=bad?'bad show':'show';
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),4800);
}
function showBusy(on){state.busy=on;document.querySelectorAll('button[type="submit"],button[data-action="import"]').forEach(b=>b.disabled=on);}
function applyTheme(theme){state.theme=theme;localStorage.setItem('habit_theme',theme);setTheme();render();}
const dateLabel=d=>new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',month:'long',day:'numeric',weekday:'long'}).format(new Date(`${d}T12:00:00Z`));

function authView(){
  const reset=state.authMode==='reset',signup=state.authMode==='signup',password=state.authMode==='password';
  return `<div class="auth-shell"><div class="auth-art"><div class="logo large">↗</div><p class="eyebrow">YOUR DAILY COMPASS</p><h1>좋은 하루는<br><em>작은 기록</em>에서</h1><p>운동, 독서, 일상의 습관을 한곳에 모아 보세요.</p><div class="art-circles"><span>01 · 기록</span><span>02 · 지속</span><span>03 · 성장</span></div></div>
  <div class="auth-card"><div class="mobile-auth-brand"><span class="logo">↗</span> 습관 나침반</div><p class="eyebrow">WELCOME BACK</p><h2>${password?'새 비밀번호 설정':reset?'비밀번호 찾기':signup?'계정 만들기':'다시 만나 반가워요'}</h2><p class="muted">${password?'새 비밀번호를 입력하세요.':reset?'가입한 이메일로 재설정 링크를 보내드립니다.':signup?'이메일과 비밀번호로 가입하세요.':'기록을 이어가려면 로그인하세요.'}</p>
  <form id="authForm" class="stack">${password?'':`<label>이메일<input name="email" type="email" autocomplete="email" required placeholder="name@example.com" /></label>`}${reset?'':`<label>${password?'새 ':''}비밀번호<input name="password" type="password" minlength="6" autocomplete="${signup||password?'new-password':'current-password'}" required placeholder="6자 이상" /></label>`}
  <button class="primary wide" type="submit">${password?'비밀번호 변경':reset?'재설정 메일 보내기':signup?'회원가입':'로그인'} <span>→</span></button></form>
  <div class="auth-links">${signup?'<button data-action="auth-login">로그인으로</button>':reset||password?'<button data-action="auth-login">로그인으로</button>':'<button data-action="auth-signup">회원가입</button><button data-action="auth-reset">비밀번호 찾기</button>'}</div>
  <p class="auth-footnote">로그인 정보는 이 기기에 유지됩니다. 공용 기기에서는 로그아웃하세요.</p></div></div>`;
}

function layout(){
  const names={today:'오늘',overview:'요약',charts:'차트',history:'기록',settings:'설정'};
  const tabs=Object.entries(names).map(([key,label])=>`<button data-action="tab" data-tab="${key}" class="nav-item ${state.tab===key?'active':''}" aria-current="${state.tab===key?'page':'false'}"><span class="nav-icon">${({today:'＋',overview:'◫',charts:'⌁',history:'▤',settings:'⚙'})[key]}</span><span>${label}</span></button>`).join('');
  return `<div class="shell"><aside class="sidebar"><div class="brand"><span class="logo">↗</span><span>습관 나침반<small>오늘을 기록하는 공간</small></span></div><nav aria-label="주 메뉴">${tabs}</nav><div class="side-footer"><button data-action="theme" class="text-button">${state.theme==='dark'?'☀ 라이트 모드':'☾ 다크 모드'}</button><div class="side-caption">ver1.00 · made by yoonsungho</div></div></aside>
  <div class="workarea"><header class="topbar"><div><div class="eyebrow">${state.tab==='today'?'YOUR DAILY ROUTINE':names[state.tab]}</div><h1>${({today:'오늘도 한 걸음',overview:'나의 흐름',charts:'기록의 변화',history:'쌓여가는 기록',settings:'나에게 맞게'})[state.tab]}</h1><p>${dateLabel(todayKST())}</p></div><div class="top-actions"><button class="icon-btn" data-action="theme" aria-label="테마 변경" title="테마 변경">${state.theme==='dark'?'☀':'☾'}</button><span class="avatar" title="${h(state.user.email)}">${h((state.user.email||'M')[0]).toUpperCase()}</span></div></header>
  <main id="content">${({today:renderToday,overview:renderOverview,charts:renderCharts,history:renderHistory,settings:renderSettings})[state.tab]()}</main>
  <nav class="bottom-nav" aria-label="주 메뉴">${tabs}</nav></div></div>${state.editDay?renderEdit():''}`;
}

function infoFor(day,item,map){const v=map.get(day)?.values[item.id];return v===undefined?'-':item.item_type==='Boolean'?(Number(v)>=1?'완료':'미완료'):`${formatNumber(v)} ${h(item.unit)}`;}
function renderToday(){
  const day=todayKST(),map=rowsByDay(state.data.entries,state.data.notes),active=state.data.items.filter(x=>x.is_active);
  const applicable=active.filter(x=>x.item_type==='Boolean'||x.number_mode!=='Record'&&Number(x.daily_goal)>0);
  const achieved=applicable.filter(x=>completed(x,Number(map.get(day)?.values[x.id])||0)).length;
  const percent=applicable.length?Math.round(100*achieved/applicable.length):0;
  return `<div class="welcome-panel"><div><p class="eyebrow">TODAY'S PROGRESS</p><h2>${achieved===applicable.length&&applicable.length?'오늘 목표를 채웠어요':'조금씩, 꾸준히 이어가요'}</h2><p>목표 ${applicable.length}개 중 ${achieved}개 달성 · ${percent}%</p></div><div class="progress-ring" style="--progress:${percent}%"><div><b>${percent}%</b><span>오늘 달성</span></div></div></div>
  <div class="section-title"><div><h2>오늘 기록하기</h2><p>입력값은 기존 기록에 더해집니다. 체중 같은 기록형은 새 값으로 바뀝니다.</p></div></div>
  <form id="todayForm" class="today-form"><div class="habit-grid">${active.map(item=>{
    const value=map.get(day)?.values[item.id];const done=completed(item,Number(value)||0);
    return `<article class="habit-card ${done?'done':''}"><div class="habit-head"><div class="habit-symbol">${item.item_type==='Boolean'?'✓':item.number_mode==='Record'?'◎':'↗'}</div><div class="habit-current">${done?'● ':''}${value===undefined?'미기록':infoFor(day,item,map)}</div></div><h3>${h(item.name)}</h3><p>${item.item_type==='Boolean'?'오늘 완료 체크':item.number_mode==='Record'?'측정값 기록':item.daily_goal>0?`하루 목표 ${formatNumber(item.daily_goal)} ${h(item.unit)}`:'자유롭게 기록'}</p>
    <div class="habit-input">${item.item_type==='Boolean'?`<label class="check"><input type="checkbox" name="habit" value="${h(item.id)}" ${Number(value)>=1?'disabled':''} /><span>${Number(value)>=1?'완료됨':'완료 표시'}</span></label>`:`<label><span class="sr-only">${h(item.name)} ${item.number_mode==='Record'?'기록':'추가'}</span><input type="number" name="${h(item.id)}" step="any" min="0" inputmode="decimal" placeholder="${item.number_mode==='Record'?'오늘의 값':'추가할 양'}" /><span>${h(item.unit)}</span></label>`}</div></article>`;
  }).join('')||'<p class="empty">활성화된 항목이 없습니다. 설정에서 항목을 추가하세요.</p>'}</div>
  <div class="memo-panel"><label for="todayMemo">오늘의 한 줄 <small>선택</small></label><textarea id="todayMemo" name="memo" maxlength="5000" placeholder="오늘의 몸 상태나 작은 성취를 남겨보세요."></textarea><div class="memo-actions"><span>여러 번 저장하면 메모가 이어서 추가됩니다.</span><button class="primary" type="submit">오늘 기록 저장 <span>→</span></button></div></div></form>
  ${map.get(day)?.memo?`<div class="existing-memo"><span class="eyebrow">TODAY'S NOTE</span><p>${h(map.get(day).memo)}</p><button class="small-link" data-action="edit" data-day="${day}">수정하기 →</button></div>`:''}`;
}

function renderOverview(){
  const today=todayKST(),map=rowsByDay(state.data.entries,state.data.notes),active=state.data.items.filter(x=>x.is_active);
  const target=active.filter(x=>x.item_type==='Boolean'||x.number_mode!=='Record'&&x.daily_goal>0);
  const done=target.filter(x=>completed(x,Number(map.get(today)?.values[x.id])||0)).length;
  const tracked=dayRange(shiftDay(today,-6),today);
  const weekDays=tracked.filter(d=>active.some(x=>Number(map.get(d)?.values[x.id])>0)).length;
  let chain=0,cursor=active.some(x=>Number(map.get(today)?.values[x.id])>0)?today:shiftDay(today,-1);
  while(active.some(x=>Number(map.get(cursor)?.values[x.id])>0)){chain++;cursor=shiftDay(cursor,-1);}
  return `<div class="metric-grid"><div class="metric"><span>오늘 목표</span><strong>${done}<small> / ${target.length}</small></strong><p>오늘 달성한 목표</p></div><div class="metric"><span>이번 주 기록</span><strong>${weekDays}<small> / 7일</small></strong><p>최근 7일 기준</p></div><div class="metric"><span>연속 기록</span><strong>${chain}<small> 일</small></strong><p>오늘 미입력 시 어제까지 계산</p></div></div>
  <div class="split"><section class="panel"><div class="panel-heading"><h2>최근 7일</h2><p>하루에 한 항목이라도 기록한 날</p></div><div class="week-strip">${tracked.map(d=>{const on=active.some(x=>Number(map.get(d)?.values[x.id])>0);return `<div class="week-day ${on?'on':''}"><span>${'일월화수목금토'[new Date(d+'T00:00:00Z').getUTCDay()]}</span><b>${d.slice(-2)}</b><i>${on?'✓':'·'}</i></div>`;}).join('')}</div></section>
  <section class="panel"><div class="panel-heading"><h2>오늘의 습관</h2><p>기록을 한눈에 확인하세요.</p></div><div class="status-list">${active.map(x=>{const v=map.get(today)?.values[x.id];return `<div><span class="status-dot ${completed(x,Number(v)||0)?'on':''}"></span><span>${h(x.name)}</span><b>${infoFor(today,x,map)}</b></div>`;}).join('')||'<p class="empty">습관을 추가해 시작해 보세요.</p>'}</div></section></div>`;
}

function chartSvg(item,series,map){
  const buckets=chartBuckets(item,series,map);
  if(!buckets.length) return '<div class="empty">표시할 기록이 없습니다.</div>';
  const max=Math.max(1,...buckets.map(b=>Number(b.value)||0),item.number_mode==='Accumulate'&&item.item_type==='Number'?Number(item.daily_goal):0)*1.13;
  const w=740,hgt=272,left=44,right=12,top=18,bottom=35,base=hgt-bottom,ch=base-top,cw=w-left-right;
  const y=v=>base-(Number(v)||0)/max*ch;
  const lines=[0,.25,.5,.75,1].map(f=>`<g><line x1="${left}" x2="${w-right}" y1="${y(max*f)}" y2="${y(max*f)}" class="grid-line"/><text x="${left-7}" y="${y(max*f)+4}" text-anchor="end" class="axis-label">${h(formatNumber(max*f))}</text></g>`).join('');
  const goal=item.item_type==='Number'&&item.number_mode==='Accumulate'&&item.daily_goal>0&&buckets.every(b=>b.count===1)?`<line x1="${left}" x2="${w-right}" y1="${y(item.daily_goal)}" y2="${y(item.daily_goal)}" class="goal-line"/><text x="${w-right-3}" y="${y(item.daily_goal)-7}" text-anchor="end" class="goal-label">목표 ${h(formatNumber(item.daily_goal))}</text>`:'';
  const slot=cw/buckets.length;
  const bars=buckets.map((b,i)=>{
    if(b.value===null) return '';
    const x=left+i*slot+slot*.12,bw=Math.max(2,slot*.76),barh=Math.max(2,base-y(b.value));
    return `<rect x="${x}" y="${base-barh}" width="${bw}" height="${barh}" rx="${Math.min(5,bw/3)}" class="${item.item_type==='Boolean'?'chart-bar bool':'chart-bar'}"><title>${h(b.label)}${b.end!==b.label?' ~ '+h(b.end):''}: ${h(formatNumber(b.value))}${item.item_type==='Boolean'?'일': ' '+h(item.unit)}</title></rect>`;
  }).join('');
  const tickStep=Math.max(1,Math.ceil(buckets.length/7));
  const labels=buckets.map((b,i)=>i%tickStep===0||i===buckets.length-1?`<text x="${left+(i+.5)*slot}" y="${hgt-9}" text-anchor="middle" class="axis-label">${h(b.label)}</text>`:'').join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="${h(item.name)} ${h(series[0])}부터 ${h(series.at(-1))}까지 ${item.item_type==='Boolean'?'완료 일수':'기록값'} 차트"><title>${h(item.name)} 기록 차트</title>${lines}${goal}${bars}${labels}</svg>`;
}

function renderCharts(){
  const today=todayKST(),items=state.data.items.filter(x=>x.is_active),item=items.find(x=>x.id===state.chartItem)||items[0];
  if(!item) return '<div class="panel empty">설정에서 습관을 먼저 추가하세요.</div>';
  const map=rowsByDay(state.data.entries,state.data.notes),days=dayRange(startDay(state.period,today,[...map.keys()]),today);
  const stats=summarize(item,days,map,today);
  return `<div class="chart-toolbar panel"><div><span class="eyebrow">PROGRESS REPORT</span><h2>습관별 통계</h2></div><div class="filters"><label>항목<select id="chartItem">${items.map(x=>`<option value="${h(x.id)}" ${x.id===item.id?'selected':''}>${h(x.name)}</option>`).join('')}</select></label><label>기간<select id="chartPeriod">${periodOptions(state.period)}</select></label></div></div>
  <div class="metric-grid chart-metrics">${stats.map(([label,val])=>`<div class="metric"><span>${h(label)}</span><strong class="small-value">${h(val)}</strong></div>`).join('')}</div>
  <section class="panel chart-panel"><div class="panel-heading"><h2>${h(item.name)} 추이</h2><p>${days[0]} ~ ${today} · ${item.item_type==='Boolean'?'기간별 완료 일수':item.number_mode==='Record'?'기록이 있는 날의 평균':'기간별 하루 평균'}${days.length>45?' · 기간을 묶어 표시':''}</p></div>${chartSvg(item,days,map)}<p class="chart-note">긴 기간은 구간별로 묶어 표시합니다. 통계 수치는 선택한 전체 기간의 일별 값을 기준으로 계산합니다.</p></section>`;
}

function periodOptions(selected){return [['7','최근 7일'],['30','최근 30일'],['90','최근 90일'],['year','올해'],['all','전체']].map(([v,label])=>`<option value="${v}" ${selected===v?'selected':''}>${label}</option>`).join('');}
function renderHistory(){
  const today=todayKST(),map=rowsByDay(state.data.entries,state.data.notes),start=startDay(state.recordPeriod,today,[...map.keys()]);
  const days=[...map.keys()].filter(d=>d>=start&&d<=today).sort().reverse();
  return `<div class="panel history-panel"><div class="panel-heading history-heading"><div><span class="eyebrow">YOUR JOURNAL</span><h2>기록 조회</h2><p>지난 날짜도 정확한 값으로 수정할 수 있습니다.</p></div><div class="filters"><label>기간<select id="recordPeriod">${periodOptions(state.recordPeriod)}</select></label><button class="outline" data-action="export-json">JSON 백업</button><button class="outline" data-action="export-csv">CSV</button></div></div>
  ${days.length?`<div class="history-list">${days.map(d=>{const row=map.get(d),parts=state.data.items.filter(x=>row.values[x.id]!==undefined).map(x=>`<span class="entry-chip">${h(x.name)} <b>${infoFor(d,x,map)}</b></span>`).join('');return `<article class="history-row"><div class="history-date"><b>${d}</b><small>${dateLabel(d)}</small></div><div class="entry-chips">${parts||'<span class="muted">메모만 기록</span>'}${row.memo?`<p class="note-preview">${h(row.memo)}</p>`:''}</div><button class="small-link" data-action="edit" data-day="${d}">수정</button></article>`;}).join('')}</div>`:'<div class="empty">이 기간에 저장된 기록이 없습니다.</div>'}</div>
  <button class="outline add-past" data-action="edit" data-day="${today}">날짜를 선택해 기록 수정하기</button>`;
}

function renderEdit(){
  const today=todayKST(),map=rowsByDay(state.data.entries,state.data.notes),row=map.get(state.editDay),items=state.data.items.filter(x=>x.is_active||row?.values[x.id]!==undefined);
  return `<div class="modal-overlay" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-label="기록 수정"><div class="modal-head"><div><span class="eyebrow">EDIT RECORD</span><h2>하루 기록 수정</h2></div><button class="icon-btn" data-action="close-modal" aria-label="닫기">✕</button></div><form id="editForm"><label>기록 날짜<input id="editDate" type="date" name="day" max="${today}" value="${state.editDay}" required /></label><p class="muted">입력한 값으로 해당 날짜의 기록을 교체합니다. 빈칸은 삭제, 체크 해제는 미완료입니다.</p><div id="editFields">${items.map(x=>`<label class="edit-row"><span>${h(x.name)} <small>${h(x.unit)}</small></span>${x.item_type==='Boolean'?`<input type="checkbox" name="${h(x.id)}" ${Number(row?.values[x.id])>=1?'checked':''}/>`:`<input type="number" name="${h(x.id)}" min="0" step="any" inputmode="decimal" value="${row?.values[x.id]??''}" placeholder="비우면 삭제" />`}</label>`).join('')}</div><label>메모<textarea name="memo" maxlength="5000">${h(row?.memo||'')}</textarea></label><button class="primary wide" type="submit">수정 내용 저장</button></form></div></div>`;
}

function renderSettings(){
  const list=state.data.items.filter(x=>x.is_active||state.viewArchived);
  return `<div class="panel settings-panel"><div class="panel-heading"><span class="eyebrow">MAKE IT YOURS</span><h2>습관 설정</h2><p>이름을 바꿔도 과거 기록이 유지됩니다. 사용하지 않는 항목은 보관해 두세요.</p></div><div class="settings-actions"><button class="outline" data-action="new-item">+ 새 항목</button><button class="text-button" data-action="archived">${state.viewArchived?'보관 항목 숨기기':'보관 항목 보기'}</button></div><div class="settings-list">${list.map(x=>`<div class="setting-row"><div class="setting-icon">${x.item_type==='Boolean'?'✓':x.number_mode==='Record'?'◎':'↗'}</div><div><b>${h(x.name)}</b><small>${x.item_type==='Boolean'?'완료 체크':x.number_mode==='Record'?'기록형':`목표 ${formatNumber(x.daily_goal)} ${h(x.unit)}`}${x.is_active?'':' · 보관됨'}</small></div><button class="small-link" data-action="item-edit" data-id="${h(x.id)}">수정</button></div>`).join('')}</div></div>
  <div class="panel data-panel"><span class="eyebrow">YOUR DATA</span><h2>데이터 관리</h2><p>기존 Apps Script의 JSON 백업을 가져오거나, 현재 기록을 보관할 수 있습니다.</p><div class="data-buttons"><label class="outline file-label">JSON 가져오기<input type="file" id="importFile" accept=".json,application/json" hidden /></label><button class="outline" data-action="export-json">JSON 백업</button><button class="outline" data-action="export-csv">CSV 다운로드</button></div><p class="muted small">같은 날짜와 항목의 기록은 가져온 값으로 덮어씁니다. 다른 기록은 보존됩니다.</p></div>
  <div class="panel account-panel"><span class="eyebrow">ACCOUNT</span><h2>계정</h2><p>${h(state.user.email)}</p><button class="outline" data-action="signout">로그아웃</button></div><p class="version">ver1.00 · made by yoonsungho</p>`;
}

function itemModal(item){
  const x=item||{name:'',unit:'',daily_goal:1,item_type:'Number',number_mode:'Accumulate',display_order:state.data.items.length+1,is_active:true};
  state.editItemId=item?.id||null;
  document.querySelector('#itemModal')?.remove();
  const outer=document.createElement('div');outer.id='itemModal';outer.className='modal-overlay';outer.dataset.action='close-item';
  outer.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="습관 설정"><div class="modal-head"><h2>${item?'습관 수정':'새 습관'}</h2><button class="icon-btn" data-action="close-item">✕</button></div><form id="itemForm" class="item-form"><label>이름<input name="name" required maxlength="80" value="${h(x.name)}" placeholder="예: 스트레칭" /></label><div class="form-pair"><label>단위<input name="unit" maxlength="24" value="${h(x.unit)}" placeholder="회, 분, kg" /></label><label>하루 목표<input name="daily_goal" type="number" min="0" step="any" value="${h(x.daily_goal)}" /></label></div><div class="form-pair"><label>종류<select name="item_type"><option value="Number" ${x.item_type==='Number'?'selected':''}>숫자 입력</option><option value="Boolean" ${x.item_type==='Boolean'?'selected':''}>완료 체크</option></select></label><label>입력 방식<select name="number_mode"><option value="Accumulate" ${x.number_mode==='Accumulate'?'selected':''}>합산형</option><option value="Record" ${x.number_mode==='Record'?'selected':''}>기록형</option></select></label></div><label>표시 순서<input name="display_order" type="number" min="0" value="${h(x.display_order)}" /></label><p class="muted">합산형은 추가할 때마다 더합니다. 기록형은 마지막 입력값으로 바뀝니다.</p><div class="modal-actions">${item?`<button type="button" class="outline" data-action="toggle-active" data-id="${h(item.id)}">${item.is_active?'보관하기':'다시 사용'}</button>`:''}<button type="submit" class="primary">설정 저장</button></div></form></div>`;
  document.body.append(outer);
}

function render(){setTheme();root.innerHTML=!configured?`<div class="setup-error"><span class="logo">↗</span><h1>설정이 필요합니다</h1><p>프로젝트의 환경 변수 VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY를 등록한 뒤 다시 배포하세요.</p><p>설치 순서는 README.md를 확인하세요.</p></div>`:state.authMode==='password'?authView():state.user?(state.data?layout():'<div class="loading-page">기록을 불러오는 중…</div>'):authView();}

async function reload(){
  if(!state.user)return;
  try{state.data=await loadAll(state.user.id);render();}
  catch(e){render();toast(`불러오기 실패: ${errorText(e)}`,true);}
}

async function boot(){
  render();if(!configured)return;
  supabase.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){state.authMode='password';render();return;}
    if(event==='SIGNED_OUT'){state.user=null;state.data=null;state.authMode='login';render();}
    if(event==='SIGNED_IN'&&session?.user&&state.user?.id!==session.user.id){
      state.user=session.user;state.data=null;render();setTimeout(reload,0);
    }
  });
  try{
    const {data,error}=await supabase.auth.getSession();if(error)throw error;
    if(data.session?.user&&state.user?.id!==data.session.user.id){state.user=data.session.user;render();await reload();}
  }catch(e){toast(errorText(e),true);}
}

document.addEventListener('click',async e=>{
  const node=e.target.closest('[data-action]');if(!node)return;
  const action=node.dataset.action;
  if(action==='close-modal'&&e.target!==node&&e.target.closest('.modal')&&!e.target.closest('[data-action="close-modal"]'))return;
  if(action==='close-item'&&e.target!==node&&e.target.closest('.modal')&&!e.target.closest('[data-action="close-item"]'))return;
  if(action==='auth-login'||action==='auth-signup'||action==='auth-reset'){state.authMode=action.slice(5);render();}
  if(action==='theme')applyTheme(state.theme==='dark'?'light':'dark');
  if(action==='tab'){state.tab=node.dataset.tab;state.editDay=null;render();window.scrollTo(0,0);}
  if(action==='edit'){state.editDay=node.dataset.day;render();}
  if(action==='close-modal'){state.editDay=null;render();}
  if(action==='close-item')document.querySelector('#itemModal')?.remove();
  if(action==='new-item')itemModal(null);
  if(action==='item-edit')itemModal(state.data.items.find(x=>x.id===node.dataset.id));
  if(action==='archived'){state.viewArchived=!state.viewArchived;render();}
  if(action==='toggle-active'){
    const item=state.data.items.find(x=>x.id===node.dataset.id);
    try{showBusy(true);await updateActive(item,!item.is_active,state.user.id);document.querySelector('#itemModal')?.remove();await reload();toast(item.is_active?'항목을 보관했습니다.':'항목을 다시 사용합니다.');}
    catch(err){toast(errorText(err),true);}finally{showBusy(false);}
  }
  if(action==='signout'){
    try{const {error}=await supabase.auth.signOut();if(error)throw error;}catch(err){toast(errorText(err),true);}
  }
  if(action==='export-json')exportJSON();
  if(action==='export-csv')exportCSV();
});

document.addEventListener('change',e=>{
  if(e.target.id==='chartItem'){state.chartItem=e.target.value;render();}
  if(e.target.id==='chartPeriod'){state.period=e.target.value;render();}
  if(e.target.id==='recordPeriod'){state.recordPeriod=e.target.value;render();}
  if(e.target.id==='editDate'){
    if(e.target.value>todayKST()){toast('미래 날짜는 수정할 수 없습니다.',true);return;}
    state.editDay=e.target.value;render();
  }
  if(e.target.id==='importFile'&&e.target.files?.[0])importJSON(e.target.files[0]);
});

document.addEventListener('submit',async e=>{
  const form=e.target;if(!['authForm','todayForm','editForm','itemForm'].includes(form.id))return;
  e.preventDefault();if(state.busy)return;showBusy(true);
  try{
    const fd=new FormData(form);
    if(form.id==='authForm'){
      const email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
      if(state.authMode==='reset'){
        const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin});if(error)throw error;
        toast('재설정 메일을 보냈습니다. 이메일을 확인하세요.');
      }else if(state.authMode==='password'){
        const {error}=await supabase.auth.updateUser({password});if(error)throw error;
        state.authMode='login';toast('비밀번호를 변경했습니다.');render();
      }else if(state.authMode==='signup'){
        const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;
        toast(data.session?'가입 및 로그인이 완료되었습니다.':'확인 메일을 보냈습니다. 이메일 인증 후 로그인하세요.');
      }else{
        const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
      }
    }
    if(form.id==='todayForm'){
      const values=[];
      for(const item of state.data.items.filter(x=>x.is_active)){
        if(item.item_type==='Boolean'){
          if(fd.getAll('habit').includes(item.id))values.push({id:item.id,value:1});
        }else{
          const raw=String(fd.get(item.id)??'').trim();
          if(raw!==''){const value=Number(raw);if(!Number.isFinite(value)||value<0)throw Error('0 이상의 숫자를 입력하세요.');values.push({id:item.id,value});}
        }
      }
      const memo=String(fd.get('memo')||'').trim();
      if(!values.length&&!memo)throw Error('숫자, 완료 체크 또는 메모를 입력하세요.');
      await addDay(todayKST(),values,memo);await reload();toast('오늘 기록을 저장했습니다.');
    }
    if(form.id==='editForm'){
      const day=String(fd.get('day'));
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>todayKST())throw Error('날짜를 확인하세요.');
      const original=rowsByDay(state.data.entries,state.data.notes).get(day);
      const items=state.data.items.filter(x=>x.is_active||original?.values[x.id]!==undefined);
      const values=[];
      for(const item of items){
        if(item.item_type==='Boolean'){if(fd.has(item.id))values.push({id:item.id,value:1});}
        else {const raw=String(fd.get(item.id)??'').trim();if(raw!==''){
          const value=Number(raw);if(!Number.isFinite(value)||value<0)throw Error('0 이상의 숫자를 입력하세요.');
          values.push({id:item.id,value});}}
      }
      await replaceDay(day,values,String(fd.get('memo')||''));state.editDay=null;await reload();toast('기록을 수정했습니다.');
    }
    if(form.id==='itemForm'){
      const previous=state.data.items.find(x=>x.id===state.editItemId);
      const item={...previous,name:String(fd.get('name')||'').trim(),unit:String(fd.get('unit')||''),daily_goal:Number(fd.get('daily_goal')),
        item_type:fd.get('item_type'),number_mode:fd.get('number_mode'),display_order:Number(fd.get('display_order')),is_active:previous?.is_active??true};
      if(!item.name||!Number.isFinite(item.daily_goal)||item.daily_goal<0)throw Error('이름과 목표 값을 확인하세요.');
      await saveItem(item,state.user.id);document.querySelector('#itemModal')?.remove();await reload();toast('습관 설정을 저장했습니다.');
    }
  }catch(err){toast(errorText(err),true);}finally{showBusy(false);}
});

function download(content,name,type){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportJSON(){
  const {items,entries,notes}=state.data;
  const settings=items.map(x=>({ItemName:x.name,Unit:x.unit,DailyGoal:Number(x.daily_goal),IsActive:x.is_active,DisplayOrder:x.display_order,ItemType:x.item_type,NumberMode:x.number_mode}));
  const map=rowsByDay(entries,notes),records=[...map.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(row=>{
    const result={Date:row.day,Memo:row.memo};
    for(const item of items)if(row.values[item.id]!==undefined)result[item.name]=row.values[item.id];
    return result;
  });
  download(JSON.stringify({exportedAt:new Date().toISOString(),settings,records},null,2),`habit_backup_${todayKST()}.json`,'application/json;charset=utf-8');
}
function exportCSV(){
  const map=rowsByDay(state.data.entries,state.data.notes),items=state.data.items;
  const cols=['Date',...items.map(x=>x.name),'Memo'];
  const quote=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const lines=[cols.map(quote).join(','),...[...map.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(row=>[row.day,...items.map(x=>row.values[x.id]??''),row.memo].map(quote).join(','))];
  download('\ufeff'+lines.join('\r\n'),`habit_records_${todayKST()}.csv`,'text/csv;charset=utf-8');
}

async function importJSON(file){
  if(state.busy)return;showBusy(true);
  try{
    if(file.size>20*1024*1024)throw Error('20MB 이하의 JSON 파일을 선택하세요.');
    const backup=JSON.parse(await file.text());
    if(!Array.isArray(backup.settings)||!Array.isArray(backup.records))throw Error('설정과 기록이 포함된 JSON 백업을 선택하세요.');
    if(backup.settings.length>1000||backup.records.length>100000)throw Error('백업 파일이 너무 큽니다.');
    const known=new Map(state.data.items.map(x=>[x.name,x]));
    const planned=new Set();
    for(const entry of backup.settings){
      const name=String(entry.ItemName||'').trim();
      if(!name||planned.has(name))throw Error('백업에 이름이 비어 있거나 중복된 항목이 있습니다.');
      planned.add(name);
    }
    const dates=new Set();
    for(const row of backup.records){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(row.Date||''))||row.Date>todayKST())throw Error('백업에 유효하지 않은 날짜가 있습니다.');
      if(dates.has(row.Date))throw Error('백업에 같은 날짜가 중복되어 있습니다.');
      dates.add(row.Date);
      for(const [name,value] of Object.entries(row)){
        if(['Date','Memo','UpdatedAt'].includes(name)||value===''||value===null)continue;
        if(!Number.isFinite(Number(value))||Number(value)<0)throw Error(`${name} 항목의 값을 확인하세요.`);
        planned.add(name);
      }
    }
    const settings=backup.settings.map((x,i)=>({
      ...known.get(String(x.ItemName).trim()),name:String(x.ItemName).trim(),unit:String(x.Unit||''),
      daily_goal:Math.max(0,Number(x.DailyGoal)||0),is_active:x.IsActive===true||x.IsActive==='TRUE'||x.IsActive==='true'||x.IsActive===1,
      item_type:x.ItemType==='Boolean'?'Boolean':'Number',number_mode:x.NumberMode==='Record'?'Record':'Accumulate',display_order:Number(x.DisplayOrder)||i+1
    }));
    for(const name of planned)if(!settings.some(x=>x.name===name))settings.push({...known.get(name),name,unit:'',daily_goal:0,item_type:'Number',number_mode:'Accumulate',is_active:false,display_order:settings.length+1});
    // 저장 전에 JSON을 전부 검증합니다. 같은 항목/날짜는 백업 값으로 덮어씁니다.
    for(const item of settings){const saved=await saveItem(item,state.user.id);known.set(saved.name,saved);}
    const entryRows=[],noteRows=[];
    for(const row of backup.records){
      for(const [name,value] of Object.entries(row)){
        if(['Date','Memo','UpdatedAt'].includes(name)||value===''||value===null)continue;
        entryRows.push({user_id:state.user.id,day:row.Date,item_id:known.get(name).id,value:Number(value)});
      }
      if(String(row.Memo||''))noteRows.push({user_id:state.user.id,day:row.Date,memo:String(row.Memo).slice(0,5000)});
    }
    for(let i=0;i<entryRows.length;i+=400){const {error}=await supabase.from('habit_entries').upsert(entryRows.slice(i,i+400),{onConflict:'user_id,day,item_id'});if(error)throw error;}
    for(let i=0;i<noteRows.length;i+=400){const {error}=await supabase.from('habit_notes').upsert(noteRows.slice(i,i+400),{onConflict:'user_id,day'});if(error)throw error;}
    await reload();toast(`${backup.records.length}일의 백업을 가져왔습니다.`);
  }catch(err){toast(`가져오기 실패: ${errorText(err)}`,true);}finally{showBusy(false);}
}

boot();
