alter table public.profiles
  add column if not exists avatar_config jsonb;

alter table public.creators
  add column if not exists avatar_config jsonb;

comment on column public.profiles.avatar_config is 'Validated react-nice-avatar configuration for this user.';
comment on column public.creators.avatar_config is 'Validated react-nice-avatar configuration for this creator.';
