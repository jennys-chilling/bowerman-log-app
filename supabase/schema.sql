create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text,
  last_name text,
  full_name text,
  phone_number text,
  profile_image_url text,
  role text not null default 'athlete' check (role in ('athlete', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone_number text,
  add column if not exists profile_image_url text;

create table if not exists public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  week_start_date date not null,
  goal_mileage_min numeric,
  goal_mileage_max numeric,
  athlete_reflection text,
  coach_feedback text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (athlete_id, week_start_date)
);

alter table public.training_weeks
  add column if not exists goal_mileage_min numeric,
  add column if not exists goal_mileage_max numeric;

create table if not exists public.day_plans (
  id uuid primary key default gen_random_uuid(),
  training_week_id uuid not null references public.training_weeks (id) on delete cascade,
  date date not null,
  day_of_week text not null check (
    day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  am_coach jsonb not null default '{}'::jsonb,
  pm_coach jsonb not null default '{}'::jsonb,
  lift_coach jsonb not null default '{}'::jsonb,
  am_session jsonb not null default '{}'::jsonb,
  pm_session jsonb not null default '{}'::jsonb,
  lift jsonb not null default '{}'::jsonb,
  splits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (training_week_id, date)
);

alter table public.day_plans
  add column if not exists lift_coach jsonb not null default '{}'::jsonb;

create table if not exists public.week_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  goal_mileage_min numeric,
  goal_mileage_max numeric,
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shoes (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  model text not null,
  type text not null check (type in ('Trainer', 'Workout', 'Spike', 'Trail', 'Racing Flat')),
  current_mileage numeric not null default 0,
  status text not null default 'Active' check (status in ('Active', 'Retired')),
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_email text,
  category text not null default 'feedback' check (category in ('question', 'feedback', 'bug', 'other')),
  subject text,
  message text not null,
  page_path text,
  user_agent text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists training_weeks_athlete_id_idx on public.training_weeks (athlete_id);
create index if not exists training_weeks_week_start_date_idx on public.training_weeks (week_start_date);
create index if not exists day_plans_training_week_id_idx on public.day_plans (training_week_id);
create index if not exists day_plans_date_idx on public.day_plans (date);
create index if not exists week_templates_coach_id_idx on public.week_templates (coach_id);
create index if not exists week_templates_updated_at_idx on public.week_templates (updated_at desc);
create index if not exists shoes_athlete_id_idx on public.shoes (athlete_id);
create index if not exists feedback_submissions_user_id_idx on public.feedback_submissions (user_id);
create index if not exists feedback_submissions_created_at_idx on public.feedback_submissions (created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_training_weeks_updated_at on public.training_weeks;
create trigger set_training_weeks_updated_at
before update on public.training_weeks
for each row execute function public.set_updated_at();

drop trigger if exists set_day_plans_updated_at on public.day_plans;
create trigger set_day_plans_updated_at
before update on public.day_plans
for each row execute function public.set_updated_at();

drop trigger if exists set_week_templates_updated_at on public.week_templates;
create trigger set_week_templates_updated_at
before update on public.week_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_shoes_updated_at on public.shoes;
create trigger set_shoes_updated_at
before update on public.shoes
for each row execute function public.set_updated_at();

drop trigger if exists set_feedback_submissions_updated_at on public.feedback_submissions;
create trigger set_feedback_submissions_updated_at
before update on public.feedback_submissions
for each row execute function public.set_updated_at();

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, full_name, role)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'first_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'last_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ''),
    'athlete'
  )
  on conflict (id) do update
    set
      email = excluded.email,
      first_name = coalesce(public.profiles.first_name, excluded.first_name),
      last_name = coalesce(public.profiles.last_name, excluded.last_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, first_name, last_name, full_name, role)
select
  id,
  email,
  nullif(coalesce(raw_user_meta_data ->> 'first_name', ''), ''),
  nullif(coalesce(raw_user_meta_data ->> 'last_name', ''), ''),
  nullif(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''), ''),
  'athlete'
from auth.users
on conflict (id) do nothing;

update public.profiles
set
  first_name = coalesce(first_name, nullif(split_part(full_name, ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(trim(regexp_replace(coalesce(full_name, ''), '^\S+\s*', '')), '')
  )
where full_name is not null
  and full_name <> email
  and full_name <> split_part(email, '@', 1)
  and (first_name is null or last_name is null);

alter table public.profiles enable row level security;
alter table public.training_weeks enable row level security;
alter table public.day_plans enable row level security;
alter table public.week_templates enable row level security;
alter table public.shoes enable row level security;
alter table public.feedback_submissions enable row level security;

drop policy if exists "Profiles can be read by owner or admin" on public.profiles;
create policy "Profiles can be read by owner or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Profiles can be inserted by owner" on public.profiles;
create policy "Profiles can be inserted by owner"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Profiles can be updated by owner or admin" on public.profiles;
create policy "Profiles can be updated by owner or admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Training weeks can be read by athlete or admin" on public.training_weeks;
create policy "Training weeks can be read by athlete or admin"
on public.training_weeks
for select
to authenticated
using (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Training weeks can be inserted by athlete or admin" on public.training_weeks;
create policy "Training weeks can be inserted by athlete or admin"
on public.training_weeks
for insert
to authenticated
with check (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Training weeks can be updated by athlete or admin" on public.training_weeks;
create policy "Training weeks can be updated by athlete or admin"
on public.training_weeks
for update
to authenticated
using (athlete_id = auth.uid() or public.is_admin())
with check (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Training weeks can be deleted by athlete or admin" on public.training_weeks;
create policy "Training weeks can be deleted by athlete or admin"
on public.training_weeks
for delete
to authenticated
using (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Shoes can be read by athlete or admin" on public.shoes;
create policy "Shoes can be read by athlete or admin"
on public.shoes
for select
to authenticated
using (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Shoes can be inserted by athlete or admin" on public.shoes;
create policy "Shoes can be inserted by athlete or admin"
on public.shoes
for insert
to authenticated
with check (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Shoes can be updated by athlete or admin" on public.shoes;
create policy "Shoes can be updated by athlete or admin"
on public.shoes
for update
to authenticated
using (athlete_id = auth.uid() or public.is_admin())
with check (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Shoes can be deleted by athlete or admin" on public.shoes;
create policy "Shoes can be deleted by athlete or admin"
on public.shoes
for delete
to authenticated
using (athlete_id = auth.uid() or public.is_admin());

drop policy if exists "Week templates can be read by admin" on public.week_templates;
create policy "Week templates can be read by admin"
on public.week_templates
for select
to authenticated
using (public.is_admin());

drop policy if exists "Week templates can be inserted by admin" on public.week_templates;
create policy "Week templates can be inserted by admin"
on public.week_templates
for insert
to authenticated
with check (public.is_admin() and coach_id = auth.uid());

drop policy if exists "Week templates can be updated by admin" on public.week_templates;
create policy "Week templates can be updated by admin"
on public.week_templates
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Week templates can be deleted by admin" on public.week_templates;
create policy "Week templates can be deleted by admin"
on public.week_templates
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Feedback can be read by submitter or admin" on public.feedback_submissions;
create policy "Feedback can be read by submitter or admin"
on public.feedback_submissions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Feedback can be inserted by submitter" on public.feedback_submissions;
create policy "Feedback can be inserted by submitter"
on public.feedback_submissions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Feedback can be updated by admin" on public.feedback_submissions;
create policy "Feedback can be updated by admin"
on public.feedback_submissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Feedback can be deleted by admin" on public.feedback_submissions;
create policy "Feedback can be deleted by admin"
on public.feedback_submissions
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Profile pictures can be read by authenticated users" on storage.objects;
create policy "Profile pictures can be read by authenticated users"
on storage.objects
for select
to authenticated
using (bucket_id = 'profile-pictures');

drop policy if exists "Users can upload their own profile pictures" on storage.objects;
create policy "Users can upload their own profile pictures"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own profile pictures" on storage.objects;
create policy "Users can update their own profile pictures"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own profile pictures" on storage.objects;
create policy "Users can delete their own profile pictures"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Day plans can be read by athlete or admin" on public.day_plans;
create policy "Day plans can be read by athlete or admin"
on public.day_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.training_weeks
    where training_weeks.id = day_plans.training_week_id
      and (training_weeks.athlete_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Day plans can be inserted by athlete or admin" on public.day_plans;
create policy "Day plans can be inserted by athlete or admin"
on public.day_plans
for insert
to authenticated
with check (
  exists (
    select 1
    from public.training_weeks
    where training_weeks.id = day_plans.training_week_id
      and (training_weeks.athlete_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Day plans can be updated by athlete or admin" on public.day_plans;
create policy "Day plans can be updated by athlete or admin"
on public.day_plans
for update
to authenticated
using (
  exists (
    select 1
    from public.training_weeks
    where training_weeks.id = day_plans.training_week_id
      and (training_weeks.athlete_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.training_weeks
    where training_weeks.id = day_plans.training_week_id
      and (training_weeks.athlete_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Day plans can be deleted by athlete or admin" on public.day_plans;
create policy "Day plans can be deleted by athlete or admin"
on public.day_plans
for delete
to authenticated
using (
  exists (
    select 1
    from public.training_weeks
    where training_weeks.id = day_plans.training_week_id
      and (training_weeks.athlete_id = auth.uid() or public.is_admin())
  )
);
