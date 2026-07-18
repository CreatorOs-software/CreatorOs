create table brand_contacts (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references brands(id) on delete cascade not null,
  agency_id uuid references agencies(id) on delete cascade not null,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz default now()
);

alter table brand_contacts enable row level security;

create policy "agency members can manage brand contacts"
  on brand_contacts
  for all
  using (
    agency_id in (
      select p.agency_id from profiles p where p.id = auth.uid()
    )
  );

create index brand_contacts_brand_id_idx on brand_contacts(brand_id);
