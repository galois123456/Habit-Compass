import test from 'node:test';
import assert from 'node:assert/strict';
import {shiftDay,dayRange,startDay,rowsByDay,completed,streak,chartBuckets,summarize,scheduledOn,scheduleLabel,weekdayMask,changeSchedule} from '../src/logic.js';

const accumulate={id:'a',name:'걷기',unit:'분',daily_goal:30,item_type:'Number',number_mode:'Accumulate'};
const record={id:'r',name:'체중',unit:'kg',daily_goal:0,item_type:'Number',number_mode:'Record'};
const check={id:'b',name:'독서',unit:'완료',daily_goal:1,item_type:'Boolean',number_mode:'Accumulate'};

test('요일 변경은 적용일 이후에만 반영하고 미래 예약과 JSON 복원에도 유지한다',()=>{
  const item={...check,schedule_days:31};
  item.schedule_history=changeSchedule(item,96,'2026-10-12');
  item.schedule_history=changeSchedule(item,127,'2026-11-01');
  assert.equal(weekdayMask(item,'2026-10-11'),31);
  assert.equal(weekdayMask(item,'2026-10-12'),96);
  assert.equal(weekdayMask(item,'2026-11-01'),127);
  assert.equal(scheduledOn(item,'2026-10-09'),true);
  assert.equal(scheduledOn(item,'2026-10-16'),false);
  const copy=JSON.parse(JSON.stringify(item));
  assert.equal(scheduleLabel(copy,'2026-10-10'),'평일');
  assert.equal(scheduleLabel(copy,'2026-10-18'),'주말');
  const map=rowsByDay([{day:'2026-10-09',item_id:'b',value:1}],[]);
  assert.equal(summarize(copy,['2026-10-09'],map,'2026-10-09')[1][1],'100%');
});

test('연말·윤년 날짜를 넘어도 일별 계산이 유지된다',()=>{
  assert.equal(shiftDay('2024-02-28',1),'2024-02-29');
  assert.equal(shiftDay('2026-01-01',-1),'2025-12-31');
  assert.deepEqual(dayRange('2025-12-31','2026-01-02'),['2025-12-31','2026-01-01','2026-01-02']);
});

test('오늘 미입력 상태라면 연속 기록은 어제까지 센다',()=>{
  const map=rowsByDay([
    {day:'2026-09-25',item_id:'a',value:35},
    {day:'2026-09-26',item_id:'a',value:40}
  ],[]);
  assert.equal(streak(map,accumulate,'2026-09-27'),2);
  assert.equal(completed(record,67.2),true);
  assert.equal(completed(check,0),false);
});

test('기록형 차트는 미측정일을 0kg로 계산하지 않는다',()=>{
  const map=rowsByDay([
    {day:'2026-09-25',item_id:'r',value:75},
    {day:'2026-09-27',item_id:'r',value:77}
  ],[]);
  const days=dayRange('2026-09-25','2026-09-27');
  assert.equal(chartBuckets(record,days,map)[1].value,null);
  assert.deepEqual(summarize(record,days,map,'2026-09-27').slice(0,3),[
    ['최근 기록','77 kg'],['기록 횟수','2일'],['기록 평균','76 kg']
  ]);
});

test('기간별 막대 수는 일별 7·30·90개, 최근 10년은 연도별 10개다',()=>{
  const today='2026-09-30',map=new Map();
  for(const n of ['7','30','90']){
    const days=dayRange(startDay(n,today),today);
    assert.equal(chartBuckets(accumulate,days,map,n).length,Number(n));
  }
  const yearDays=dayRange(startDay('year',today),today);
  assert.equal(chartBuckets(accumulate,yearDays,map,'year').length,yearDays.length);
  const years=dayRange(startDay('10y',today),today);
  const bars=chartBuckets(accumulate,years,map,'10y');
  assert.deepEqual(bars.map(bar=>bar.label),['2017','2018','2019','2020','2021','2022','2023','2024','2025','2026']);
});

test('선택 요일 표시와 휴식일 제외 달성률 및 연속 횟수',()=>{
  const weekdays={...check,schedule_days:31};
  assert.equal(scheduleLabel(weekdays),'평일');
  assert.equal(scheduleLabel({...check,schedule_days:96}),'주말');
  assert.equal(scheduleLabel({...check,schedule_days:1}),'월');
  assert.equal(scheduleLabel({...check,schedule_days:5}),'월 수');
  assert.equal(scheduleLabel(check),'매일');
  assert.equal(scheduledOn(weekdays,'2026-09-26'),false);
  assert.equal(scheduledOn(weekdays,'2026-09-28'),true);
  const days=dayRange('2026-09-25','2026-09-28');
  const map=rowsByDay([
    {day:'2026-09-25',item_id:'b',value:1},
    {day:'2026-09-26',item_id:'b',value:1},
    {day:'2026-09-28',item_id:'b',value:1}
  ],[]);
  assert.equal(summarize(weekdays,days,map,'2026-09-28')[1][1],'100%');
  assert.equal(streak(map,weekdays,'2026-09-28'),2);
  const bars=chartBuckets(weekdays,days,map);
  assert.equal(bars[1].scheduled,false);
  assert.equal(bars[1].achieved,true);
  assert.equal(bars[1].value,1);
});
