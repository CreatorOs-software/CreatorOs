create table if not exists public.email_thread_creator_matches (
  thread_id uuid not null references public.email_threads(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  confidence integer not null check (confidence between 0 and 100),
  relation text not null check (relation in ('required', 'alternative', 'group', 'mentioned', 'unknown')),
  evidence text,
  request_group_key text,
  source text not null default 'ai_label' check (source in ('ai_label', 'ai_analysis', 'manual', 'linked_request')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (thread_id, creator_id)
);

create index if not exists email_thread_creator_matches_agency_thread_idx
  on public.email_thread_creator_matches (agency_id, thread_id);
create index if not exists email_thread_creator_matches_creator_idx
  on public.email_thread_creator_matches (creator_id);

drop trigger if exists email_thread_creator_matches_updated_at on public.email_thread_creator_matches;
create trigger email_thread_creator_matches_updated_at
  before update on public.email_thread_creator_matches
  for each row execute function public.touch_updated_at();

alter table public.email_thread_creator_matches enable row level security;
revoke all on public.email_thread_creator_matches from anon, authenticated;
grant select on public.email_thread_creator_matches to authenticated;

drop policy if exists "Agency members can view email creator matches"
  on public.email_thread_creator_matches;
create policy "Agency members can view email creator matches"
  on public.email_thread_creator_matches
  for select
  to authenticated
  using (agency_id = public.current_agency_id());

alter table public.email_threads
  add column if not exists request_structure text
    check (request_structure in (
      'single_request_single_creator',
      'single_request_multiple_creators',
      'multiple_distinct_requests',
      'unclear'
    )),
  add column if not exists request_structure_confidence integer
    check (request_structure_confidence between 0 and 100);

create table if not exists public.campaign_groups (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  email_thread_id uuid references public.email_threads(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_groups_agency_idx on public.campaign_groups (agency_id);
create index if not exists campaign_groups_thread_idx on public.campaign_groups (email_thread_id);

drop trigger if exists campaign_groups_updated_at on public.campaign_groups;
create trigger campaign_groups_updated_at
  before update on public.campaign_groups
  for each row execute function public.touch_updated_at();

alter table public.campaign_groups enable row level security;
revoke all on public.campaign_groups from anon, authenticated;
grant select, insert, update, delete on public.campaign_groups to authenticated;

drop policy if exists "Agency members can manage campaign groups"
  on public.campaign_groups;
create policy "Agency members can manage campaign groups"
  on public.campaign_groups
  for all
  to authenticated
  using (agency_id = public.current_agency_id())
  with check (agency_id = public.current_agency_id());

alter table public.anfragen
  add column if not exists campaign_group_id uuid
    references public.campaign_groups(id) on delete set null;

create index if not exists anfragen_campaign_group_idx
  on public.anfragen (campaign_group_id)
  where campaign_group_id is not null;
