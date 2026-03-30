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
  full_name text,
  role text not null default 'athlete' check (role in ('athlete', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.training_weeks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  week_start_date date not null,
  athlete_reflection text,
  coach_feedback text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (athlete_id, week_start_date)
);

create table if not exists public.day_plans (
  id uuid primary key default gen_random_uuid(),
  training_week_id uuid not null references public.training_weeks (id) on delete cascade,
  date date not null,
  day_of_week text not null check (
    day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  am_coach jsonb not null default '{}'::jsonb,
  pm_coach jsonb not null default '{}'::jsonb,
  am_session jsonb not null default '{}'::jsonb,
  pm_session jsonb not null default '{}'::jsonb,
  lift jsonb not null default '{}'::jsonb,
  splits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (training_week_id, date)
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

create index if not exists training_weeks_athlete_id_idx on public.training_weeks (athlete_id);
create index if not exists training_weeks_week_start_date_idx on public.training_weeks (week_start_date);
create index if not exists day_plans_training_week_id_idx on public.day_plans (training_week_id);
create index if not exists day_plans_date_idx on public.day_plans (date);
create index if not exists shoes_athlete_id_idx on public.shoes (athlete_id);

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

drop trigger if exists set_shoes_updated_at on public.shoes;
create trigger set_shoes_updated_at
before update on public.shoes
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
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'athlete'
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  'athlete'
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.training_weeks enable row level security;
alter table public.day_plans enable row level security;
alter table public.shoes enable row level security;

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
