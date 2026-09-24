alter table public.creators
  add column if not exists goals jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'creators_goals_is_array'
      and conrelid = 'public.creators'::regclass
  ) then
    alter table public.creators
      add constraint creators_goals_is_array
      check (jsonb_typeof(goals) = 'array');
  end if;
end
$$;

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
