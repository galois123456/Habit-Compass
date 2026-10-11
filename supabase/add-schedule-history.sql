-- ver1.09: 요일 변경 이력을 추가합니다. 기존 데이터는 유지됩니다.
begin;
alter table public.habit_items add column if not exists schedule_history jsonb not null default '[]'::jsonb;
alter table public.habit_items drop constraint if exists habit_items_schedule_history_check;
alter table public.habit_items add constraint habit_items_schedule_history_check check (jsonb_typeof(schedule_history) = 'array');
commit;
