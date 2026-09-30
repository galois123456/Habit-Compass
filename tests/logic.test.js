import test from 'node:test';
import assert from 'node:assert/strict';
import {shiftDay,dayRange,rowsByDay,completed,streak,chartBuckets,summarize} from '../src/logic.js';

const accumulate={id:'a',name:'걷기',unit:'분',daily_goal:30,item_type:'Number',number_mode:'Accumulate'};
const record={id:'r',name:'체중',unit:'kg',daily_goal:0,item_type:'Number',number_mode:'Record'};
const check={id:'b',name:'독서',unit:'완료',daily_goal:1,item_type:'Boolean',number_mode:'Accumulate'};

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
