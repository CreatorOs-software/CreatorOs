alter table public.email_threads
  add column if not exists request_status text not null default 'open'
  check (request_status in ('open', 'rejected', 'converted'));

create index if not exists email_threads_open_requests_idx
  on public.email_threads (agency_id, received_at desc)
  where request_status = 'open';

update public.email_threads as thread
set request_status = 'converted'
from public.conversations as conversation
where thread.conversation_id = conversation.id
  and (conversation.anfrage_id is not null or conversation.deal_id is not null)
  and thread.request_status = 'open';
