alter table public.creators
  add column if not exists goals jsonb not null default '[]'::jsonb;

alter table public.creators
  add constraint creators_goals_is_array
  check (jsonb_typeof(goals) = 'array');

update public.creators
set goals = jsonb_build_array(
  jsonb_build_object(
    'value', goal_value,
    'type', goal_type,
    'period', goal_period
  )
)
where goal_value is not null
  and goal_type is not null
  and goal_period is not null
  and goals = '[]'::jsonb;
