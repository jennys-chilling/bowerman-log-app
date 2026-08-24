# Bowerman Training Log

This project now uses Supabase for authentication and data storage, and can be deployed as a normal Vite app on Vercel.

## Environment variables

Create `.env.local` for local development:

```bash
VITE_APP_BASE_URL=http://localhost:5173
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

In Vercel, add the same variables in `Settings -> Environment Variables`, but set `VITE_APP_BASE_URL` to your deployed site URL.

## Supabase setup

1. Create a new Supabase project.
2. In Supabase, enable Email auth. For password login, enable email/password signups. For Google login, enable the Google provider.
3. Open the SQL editor and run [supabase/schema.sql](/Users/jennyschilling/bowerman-training-log/supabase/schema.sql).
4. Copy your project URL and anon key into `.env.local`.
5. In Supabase `Authentication -> URL Configuration`, set the local site URL to `http://localhost:5173` and add `http://localhost:5173/*` as an allowed redirect URL.
6. Start the app with `npm run dev`.
7. Sign in with email/password, a magic link, or Google.
8. Promote your coach account to admin after the first sign-in:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

New users are created as `athlete` profiles by default.

When the schema changes, rerun [supabase/schema.sql](/Users/jennyschilling/bowerman-training-log/supabase/schema.sql) in the Supabase SQL editor. The script uses `if not exists` and replacement policies/triggers, so it is safe to rerun for updates like profile fields, the profile-picture bucket, the feedback submissions table, shoe `last_used_date`, and the `increment_shoe_mileage` RPC.

## Google auth setup

1. In Google Cloud Console, create an OAuth client for a web application.
2. Add the Supabase callback URL from `Supabase -> Authentication -> Providers -> Google` to Google Cloud's authorized redirect URIs.
3. Copy the Google client ID and secret into the Supabase Google provider settings.
4. In Supabase `Authentication -> URL Configuration`, include these redirect URLs:

```bash
http://localhost:5173/*
https://your-production-domain.com/*
```

The app calls `supabase.auth.signInWithOAuth({ provider: 'google' })`; Supabase handles the redirect back to the app after the provider is configured.

## Local development

```bash
npm install
npm run dev
```

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo into Vercel as a Vite project.
3. Set these environment variables in Vercel:

```bash
VITE_APP_BASE_URL=https://your-project.vercel.app
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Redeploy after saving the variables.

## Verification

- `npm run build`
- `npm run lint`
