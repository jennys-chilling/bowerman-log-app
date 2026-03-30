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
2. In Supabase, enable Email auth.
3. Open the SQL editor and run [supabase/schema.sql](/Users/jennyschilling/bowerman-training-log/supabase/schema.sql).
4. Copy your project URL and anon key into `.env.local`.
5. Start the app with `npm run dev`.
6. Sign in with your email using the magic link on the login screen.
7. Promote your coach account to admin after the first sign-in:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

New users are created as `athlete` profiles by default.

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
