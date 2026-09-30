import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key && !url.includes('YOUR_PROJECT'));
export const supabase = configured ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

export const defaults = [
  ['팔굽혀펴기','회',100,'Number','Accumulate'],
  ['스쿼트','회',100,'Number','Accumulate'],
  ['플랭크','초',180,'Number','Accumulate'],
  ['걷기','분',30,'Number','Accumulate'],
  ['독서','분',30,'Number','Accumulate'],
  ['물 마시기','잔',8,'Number','Accumulate'],
  ['수면','시간',7,'Number','Accumulate'],
  ['체중','kg',0,'Number','Record'],
  ['영양제 복용','완료',1,'Boolean','Accumulate'],
  ['금주','완료',1,'Boolean','Accumulate'],
  ['야식 안 먹기','완료',1,'Boolean','Accumulate'],
  ['일기 작성','완료',1,'Boolean','Accumulate']
];

async function checked(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function allRows(table, userId, order) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await checked(supabase.from(table).select('*').eq('user_id',userId)
      .order(order,{ascending:order === 'display_order'}).range(offset,offset + 999));
    result.push(...page);
    if (page.length < 1000) return result;
  }
}

export async function loadAll(userId) {
  let items = await allRows('habit_items',userId,'display_order');
  if (!items.length) {
    items = await checked(supabase.from('habit_items').insert(defaults.map(([name,unit,daily_goal,item_type,number_mode],index) => ({
      user_id:userId,name,unit,daily_goal,item_type,number_mode,display_order:index + 1
    }))).select());
  }
  const [entries,notes] = await Promise.all([
    allRows('habit_entries',userId,'day'),allRows('habit_notes',userId,'day')
  ]);
  return {items,entries,notes};
}

export async function addDay(day,values,memo) {
  await checked(supabase.rpc('add_daily_entries',{p_day:day,p_values:values,p_memo:memo}));
}

export async function replaceDay(day,values,memo) {
  await checked(supabase.rpc('replace_daily_entries',{p_day:day,p_values:values,p_memo:memo}));
}

export async function saveItem(item,userId) {
  const payload = {
    user_id:userId,name:item.name.trim(),unit:item.unit.trim(),daily_goal:item.item_type === 'Boolean' ? 1 : Number(item.daily_goal),
    item_type:item.item_type,number_mode:item.item_type === 'Boolean' ? 'Accumulate' : item.number_mode,
    display_order:Number(item.display_order),is_active:item.is_active
  };
  if (item.id) payload.id = item.id;
  return checked(supabase.from('habit_items').upsert(payload).select().single());
}

export async function updateActive(item,active,userId) {
  return saveItem({...item,is_active:active},userId);
}
