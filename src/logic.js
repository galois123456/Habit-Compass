export function todayKST() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date()).filter(p=>p.type !== 'literal').map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shiftDay(day,amount) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0,10);
}

export function dayRange(start,end) {
  const output = [];
  for(let day=start;day<=end;day=shiftDay(day,1)) output.push(day);
  return output;
}

export function startDay(period,today,dates=[]) {
  if(period === 'year') return `${today.slice(0,4)}-01-01`;
  if(period === '10y') return `${Number(today.slice(0,4))-9}-01-01`;
  if(period === 'all') return dates.filter(d=>d<=today).sort()[0] || today;
  return shiftDay(today,-(Number(period)-1));
}

export function rowsByDay(entries,notes) {
  const map = new Map();
  for(const entry of entries) {
    if(!map.has(entry.day)) map.set(entry.day,{day:entry.day,values:{},memo:''});
    map.get(entry.day).values[entry.item_id] = Number(entry.value);
  }
  for(const note of notes) {
    if(!map.has(note.day)) map.set(note.day,{day:note.day,values:{},memo:''});
    map.get(note.day).memo = note.memo;
  }
  return map;
}

// 월요일부터 일요일까지 하위 7비트로 저장합니다. 기존 항목은 매일(127)입니다.
export const weekdayNames=['월','화','수','목','금','토','일'];
export function weekdayMask(item) {
  const value=Number(item?.schedule_days);
  return Number.isInteger(value)&&value>=1&&value<=127?value:127;
}
export function scheduledOn(item,day) {
  const weekday=(new Date(`${day}T00:00:00Z`).getUTCDay()+6)%7;
  return Boolean(weekdayMask(item)&(1<<weekday));
}
export function scheduleLabel(item) {
  const mask=weekdayMask(item);
  if(mask===127)return '매일';
  if(mask===31)return '평일';
  if(mask===96)return '주말';
  return weekdayNames.filter((_,i)=>mask&(1<<i)).join(' ');
}

export function completed(item,value) {
  if(item.item_type === 'Boolean') return value >= 1;
  if(item.number_mode === 'Record') return value > 0;
  return Number(item.daily_goal) > 0 && value >= Number(item.daily_goal);
}

export function streak(map,item,today) {
  const success = d => completed(item, Number(map.get(d)?.values[item.id]) || 0);
  let cursor=today;
  while(!scheduledOn(item,cursor))cursor=shiftDay(cursor,-1);
  if(!success(cursor)){
    cursor=shiftDay(cursor,-1);
    while(!scheduledOn(item,cursor))cursor=shiftDay(cursor,-1);
  }
  let count=0;
  while(success(cursor)) {
    count++;cursor=shiftDay(cursor,-1);
    while(!scheduledOn(item,cursor))cursor=shiftDay(cursor,-1);
  }
  return count;
}

export function formatNumber(n) {
  return Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2});
}

export function summarize(item,series,map,today) {
  const eligible=series.filter(d=>scheduledOn(item,d));
  const recorded=eligible.filter(d=>map.get(d)?.values[item.id] !== undefined);
  const values=eligible.map(d=>Number(map.get(d)?.values[item.id]) || 0);
  const success=values.filter(v=>completed(item,v)).length;
  const best=values.reduce((acc,v)=>{
    acc.now=completed(item,v)?acc.now+1:0;
    acc.best=Math.max(acc.best,acc.now);
    return acc;
  },{now:0,best:0}).best;
  if(item.item_type === 'Boolean') return [
    ['완료',`${success}일`],['완료율',`${Math.round(success / Math.max(1,eligible.length)*100)}%`],
    ['현재 연속',`${streak(map,item,today)}일`],['기간 내 최장',`${best}일`]
  ];
  if(item.number_mode === 'Record') {
    const measured=recorded.map(d=>Number(map.get(d).values[item.id]));
    const last=measured.length ? measured[measured.length-1] : null;
    return [['최근 기록',last===null?'-':`${formatNumber(last)} ${item.unit}`],
      ['기록 횟수',`${measured.length}일`],
      ['기록 평균',measured.length?`${formatNumber(measured.reduce((a,b)=>a+b,0)/measured.length)} ${item.unit}`:'-'],
      ['최고 기록',measured.length?`${formatNumber(Math.max(...measured))} ${item.unit}`:'-']];
  }
  return [['기간 합계',`${formatNumber(values.reduce((a,b)=>a+b,0))} ${item.unit}`],
    ['하루 평균',`${formatNumber(values.reduce((a,b)=>a+b,0)/Math.max(1,eligible.length))} ${item.unit}`],
    ['목표 달성',`${success}일`],['달성률',`${item.daily_goal>0?Math.round(success/Math.max(1,eligible.length)*100):0}%`],
    ['현재 연속',`${streak(map,item,today)}일`]];
}

export function chartBuckets(item,series,map,period='30') {
  const buckets=[];
  const groups=period==='10y'
    ? Array.from({length:10},(_,i)=>{
        const year=Number(series.at(-1).slice(0,4))-9+i;
        return series.filter(day=>Number(day.slice(0,4))===year);
      })
    : series.map(day=>[day]);
  for(const days of groups) {
    if(!days.length)continue;
    const scheduled=days.filter(day=>scheduledOn(item,day));
    const raw=days.map(day=>map.get(day)?.values[item.id]);
    const recorded=raw.filter(v=>v !== undefined).map(Number);
    const value=item.item_type==='Boolean'?
      raw.filter(v=>Number(v)>=1).length:
      item.number_mode==='Record'?
        (recorded.length?recorded.reduce((a,b)=>a+b,0)/recorded.length:null):
        (scheduled.length?raw.reduce((a,b)=>a+(Number(b)||0),0)/scheduled.length:null);
    const shown=scheduled.length||recorded.length?value:null;
    buckets.push({label:period==='10y'?days[0].slice(0,4):days[0].slice(5),end:period==='10y'?days.at(-1).slice(0,4):days.at(-1).slice(5),value:shown,count:scheduled.length,scheduled:period==='10y'?null:scheduled.length>0,achieved:period==='10y'?false:completed(item,Number(raw[0])||0)});
  }
  return buckets;
}
