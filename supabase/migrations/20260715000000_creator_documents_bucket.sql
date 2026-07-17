-- Creator Documents Storage Bucket
-- Files are stored at: {agencyId}/{creatorId}/{timestamp}-{filename}
-- All storage access goes through authenticated API routes using the service client.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-documents',
  'creator-documents',
  false,
  20971520, -- 20 MB
  null       -- all mime types allowed
)
on conflict (id) do nothing;
