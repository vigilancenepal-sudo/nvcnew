alter table public.activities
  add column if not exists "technicalAuditDetails" jsonb;
