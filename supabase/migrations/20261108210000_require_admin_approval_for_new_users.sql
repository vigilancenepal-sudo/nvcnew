-- Migration: Require Admin Approval for New User Registrations
-- Description: Sets default status of new Google SSO signups to 'inactive'
-- unless the user is the primary admin (vigilancenepal@gmail.com)
-- or has been pre-created/approved by an admin.

-- 1. Update the auth trigger function for new auth users
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
    -- Link existing pre-approved profile without overriding status or role
    update public.profiles
    set uid = new.id::text,
        "authUserId" = new.id,
        "updatedAt" = now()
    where id = profile_id;
  else
    -- Newly registered user: only primary admin is active; all others require admin approval ('inactive')
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
      case when is_primary_admin then 'active' else 'inactive' end
    );
  end if;

  return new;
end;
$$;

-- 2. Update ensure_current_profile RPC
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
      raise exception 'This profile email is linked to another authentication account';
    end if;
    -- Link existing pre-approved profile without overriding status or role
    update public.profiles
    set uid = auth_record.id::text,
        "authUserId" = auth_record.id,
        "updatedAt" = now()
    where id = profile_id;
  else
    -- Newly registered user: only primary admin is active; all others require admin approval ('inactive')
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
      case when is_primary_admin then 'active' else 'inactive' end
    );
  end if;
end;
$$;

revoke all on function public.ensure_current_profile() from public;
grant execute on function public.ensure_current_profile() to authenticated;

-- 3. Optional: Set any previously auto-created non-admin accounts to 'inactive'
-- Run this if you want existing accounts to also require admin approval:
-- UPDATE public.profiles
-- SET status = 'inactive'
-- WHERE lower(email) <> 'vigilancenepal@gmail.com'
--   AND role <> 'admin';
