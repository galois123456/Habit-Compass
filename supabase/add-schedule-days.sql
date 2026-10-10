-- 기존 습관 나침반 표에 요일 설정만 추가합니다. 기존 기록은 유지됩니다.
-- 월~일을 비트 1,2,4,8,16,32,64로 저장합니다. 127은 매일입니다.
begin;
alter table public.habit_items
  add column if not exists schedule_days smallint not null default 127;
alter table public.habit_items
  drop constraint if exists habit_items_schedule_days_check;
alter table public.habit_items
  add constraint habit_items_schedule_days_check check (schedule_days between 1 and 127);
commit;
