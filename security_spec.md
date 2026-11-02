# Security Specification — NVC-IMS

Supabase Auth provides Google OAuth. The `profiles` table is the source of truth
for role, unit assignment, and active status. A database trigger links a
pre-registered profile by verified email or creates a profile for a new OAuth
user. The primary admin address is bootstrapped as an administrator.

Row-level security is enabled for all application tables:

- Users can read their own profile; only an active administrator can list or
  manage all profiles.
- Administrators can access all complaints and activities.
- Mahashakha users can access records in their assigned mahashakha.
- Shakha users can access records in their assigned shakha, and read records
  they created.
- Writes to complaints and activities require an active user assigned to the
  record's unit. Users cannot grant themselves another role because profile
  writes require administrator privileges.

Apply [`supabase/schema.sql`](./supabase/schema.sql) to a Supabase project to
create the tables, auth trigger, policies, indexes, and Realtime publication.

## Setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Enable Google under **Authentication → Providers**, then register
   `https://<project-ref>.supabase.co/auth/v1/callback` with the Google OAuth
   client. Add the app's local and deployed URLs to Supabase's redirect URL
   allow list.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from the Supabase project API settings.
4. Existing Firestore records are not copied automatically; export/import them
   separately before retiring the Firebase project.
