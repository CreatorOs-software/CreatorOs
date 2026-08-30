-- Avatars are now rendered in a neutral style; per-entity colors are no longer used.
alter table public.brands   drop column if exists color;
alter table public.profiles drop column if exists color;
