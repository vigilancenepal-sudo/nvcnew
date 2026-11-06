alter table public.activities
  add column if not exists "promotionalProgramDetails" jsonb;
