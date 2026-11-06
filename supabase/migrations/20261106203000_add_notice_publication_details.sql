alter table public.activities
  add column if not exists "noticePublicationDetails" jsonb;
