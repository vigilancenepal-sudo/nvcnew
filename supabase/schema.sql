create table if not exists public.profiles (
  id text primary key default gen_random_uuid()::text,
  uid text not null unique,
  "authUserId" uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  "fullName" text not null,
  designation text not null,
  role text not null check (role in ('admin', 'mahashakha', 'shakha')),
  "mahashakhaId" text not null,
  "shakhaId" text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create table if not exists public.complaints (
  id text primary key,
  "dartaNo" text not null,
  title text not null,
  complainant text not null,
  "complainantContact" text,
  respondent text,
  source text not null,
  ministry text not null,
  nature text not null,
  status text not null,
  priority text,
  province text,
  "districtEn" text not null,
  "localLevel" text,
  "committeeDecision" text,
  "finalDecision" text,
  "finalDecisionType" text,
  "finalDecisionDate" text,
  "implementationInfoDate" text,
  "investigationOfficer" text,
  "patracharChalaniNo" text,
  "progressNote" text,
  remarks text,
  "fiscalYear" text not null,
  "monthIndex" integer not null,
  "nepaliDate" text not null,
  "mahashakhaId" text not null,
  "shakhaId" text not null,
  "createdByUid" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.activities (
  id text primary key,
  "refNo" text not null,
  "activityType" text not null,
  title text not null,
  "entityName" text not null,
  "districtEn" text not null,
  "fiscalYear" text not null,
  "monthIndex" integer not null,
  "nepaliDate" text not null,
  "nonComplianceCount" integer not null default 0,
  "directiveCount" integer not null default 0,
  status text not null,
  "mahashakhaId" text not null,
  "shakhaId" text not null,
  "createdByUid" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists complaints_mahashakha_id_idx
  on public.complaints ("mahashakhaId");
create index if not exists complaints_shakha_id_idx
  on public.complaints ("shakhaId");
create index if not exists activities_mahashakha_id_idx
  on public.activities ("mahashakhaId");
create index if not exists activities_shakha_id_idx
  on public.activities ("shakhaId");

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where "authUserId" = auth.uid() and status = 'active'
  limit 1
$$;

create or replace function public.can_access_unit(unit_mahashakha text, unit_shakha text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p."authUserId" = auth.uid()
      and p.status = 'active'
      and (
        p.role = 'admin'
        or (p.role = 'mahashakha' and p."mahashakhaId" = unit_mahashakha)
        or (p.role = 'shakha' and p."shakhaId" = unit_shakha)
      )
  )
$$;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id text;
  is_primary_admin boolean;
begin
  is_primary_admin := lower(coalesce(new.email, '')) = 'vigilancenepal@gmail.com'
    and new.email_confirmed_at is not null;

  select id into profile_id
  from public.profiles
  where lower(email) = lower(new.email)
  limit 1;

  if profile_id is not null then
    if new.email_confirmed_at is null then
      raise exception 'A verified email address is required to link this profile';
    end if;
    update public.profiles
    set uid = new.id::text,
        "authUserId" = new.id,
        "updatedAt" = now()
    where id = profile_id;
  else
    insert into public.profiles (
      uid, "authUserId", email, "fullName", designation, role,
      "mahashakhaId", "shakhaId", status
    ) values (
      new.id::text,
      new.id,
      lower(coalesce(new.email, 'user@nvc.gov.np')),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'राष्ट्रिय सतर्कता केन्द्र अधिकारी'),
      case when is_primary_admin then 'मुख्य प्रणाली प्रशासक (Admin)' else 'शाखा अधिकृत' end,
      case when is_primary_admin then 'admin' else 'shakha' end,
      case when is_primary_admin then 'all' else 'maha_admin' end,
      case when is_primary_admin then 'all' else 'shakha_admin_plan' end,
      'active'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_auth_user();

create or replace function public.ensure_current_profile()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_record auth.users%rowtype;
  profile_id text;
  linked_user_id uuid;
  is_primary_admin boolean;
begin
  select * into auth_record
  from auth.users
  where id = auth.uid();

  if auth_record.id is null or auth_record.email is null
      or auth_record.email_confirmed_at is null then
    raise exception 'A confirmed authenticated email address is required';
  end if;

  is_primary_admin := lower(auth_record.email) = 'vigilancenepal@gmail.com';

  select id, "authUserId" into profile_id, linked_user_id
  from public.profiles
  where lower(email) = lower(auth_record.email)
  limit 1;

  if profile_id is not null then
    if linked_user_id is not null and linked_user_id <> auth_record.id then
      raise exception 'This email is already linked to another account';
    end if;
    update public.profiles
    set uid = auth_record.id::text,
        "authUserId" = auth_record.id,
        "updatedAt" = now()
    where id = profile_id;
  else
    insert into public.profiles (
      uid, "authUserId", email, "fullName", designation, role,
      "mahashakhaId", "shakhaId", status
    ) values (
      auth_record.id::text,
      auth_record.id,
      lower(auth_record.email),
      coalesce(auth_record.raw_user_meta_data ->> 'full_name', auth_record.raw_user_meta_data ->> 'name', 'राष्ट्रिय सतर्कता केन्द्र अधिकारी'),
      case when is_primary_admin then 'मुख्य प्रणाली प्रशासक (Admin)' else 'शाखा अधिकृत' end,
      case when is_primary_admin then 'admin' else 'shakha' end,
      case when is_primary_admin then 'all' else 'maha_admin' end,
      case when is_primary_admin then 'all' else 'shakha_admin_plan' end,
      'active'
    );
  end if;
end;
$$;

revoke all on function public.ensure_current_profile() from public;
grant execute on function public.ensure_current_profile() to authenticated;

alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.activities enable row level security;

drop policy if exists "Users can read own profile or admins can read all" on public.profiles;
create policy "Users can read own profile or admins can read all"
  on public.profiles for select to authenticated
  using ("authUserId" = auth.uid() or public.current_profile_role() = 'admin');

drop policy if exists "Admins can create profiles" on public.profiles;
create policy "Admins can create profiles"
  on public.profiles for insert to authenticated
  with check (public.current_profile_role() = 'admin');

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete to authenticated
  using (public.current_profile_role() = 'admin');

drop policy if exists "Users can read assigned complaints" on public.complaints;
create policy "Users can read assigned complaints"
  on public.complaints for select to authenticated
  using (
    public.can_access_unit("mahashakhaId", "shakhaId")
    or "createdByUid" = auth.uid()::text
  );

drop policy if exists "Users can create assigned complaints" on public.complaints;
create policy "Users can create assigned complaints"
  on public.complaints for insert to authenticated
  with check (public.can_access_unit("mahashakhaId", "shakhaId"));

drop policy if exists "Users can update assigned complaints" on public.complaints;
create policy "Users can update assigned complaints"
  on public.complaints for update to authenticated
  using (public.can_access_unit("mahashakhaId", "shakhaId"))
  with check (public.can_access_unit("mahashakhaId", "shakhaId"));

drop policy if exists "Users can delete assigned complaints" on public.complaints;
create policy "Users can delete assigned complaints"
  on public.complaints for delete to authenticated
  using (public.can_access_unit("mahashakhaId", "shakhaId"));

drop policy if exists "Users can read assigned activities" on public.activities;
create policy "Users can read assigned activities"
  on public.activities for select to authenticated
  using (
    public.can_access_unit("mahashakhaId", "shakhaId")
    or "createdByUid" = auth.uid()::text
  );

drop policy if exists "Users can create assigned activities" on public.activities;
create policy "Users can create assigned activities"
  on public.activities for insert to authenticated
  with check (public.can_access_unit("mahashakhaId", "shakhaId"));

drop policy if exists "Users can update assigned activities" on public.activities;
create policy "Users can update assigned activities"
  on public.activities for update to authenticated
  using (public.can_access_unit("mahashakhaId", "shakhaId"))
  with check (public.can_access_unit("mahashakhaId", "shakhaId"));

drop policy if exists "Users can delete assigned activities" on public.activities;
create policy "Users can delete assigned activities"
  on public.activities for delete to authenticated
  using (public.can_access_unit("mahashakhaId", "shakhaId"));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.complaints to authenticated;
grant select, insert, update, delete on public.activities to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.complaints;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.activities;
exception when duplicate_object then null;
end $$;
