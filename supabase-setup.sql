-- ════════════════════════════════════════════
-- FORTHRIGHT EVENTS — Supabase Setup Script
-- Run this in Supabase SQL Editor → New Query
-- ════════════════════════════════════════════

-- 1. Create the events table
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text not null check (category in ('sports', 'teambuilding', 'corporate')),
  date         date not null,
  time         time,
  end_time     time,
  location     text,
  description  text,
  spots        text,
  cover_image  text,
  facebook_album text,
  featured     boolean default false,
  created_at   timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.events enable row level security;

-- 3. Public can READ events (the website)
create policy "Public can read events"
  on public.events
  for select
  using (true);

-- 4. Only authenticated users can INSERT (admin adding events)
create policy "Authenticated users can insert events"
  on public.events
  for insert
  to authenticated
  with check (true);

-- 5. Only authenticated users can UPDATE (admin editing events)
create policy "Authenticated users can update events"
  on public.events
  for update
  to authenticated
  using (true);

-- 6. Only authenticated users can DELETE (admin deleting events)
create policy "Authenticated users can delete events"
  on public.events
  for delete
  to authenticated
  using (true);

-- ════════════════════════════════════════════
-- Done! Now go to Authentication → Users
-- and create your admin user there.
-- ════════════════════════════════════════════
