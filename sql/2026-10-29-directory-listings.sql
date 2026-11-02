-- ============================================================
-- 2026-10-29  Provider directory: public listings table
-- Project: blmnnmsrztxuwawmgkkf. Run once in Supabase > SQL Editor. Safe to re-run.
--
-- The CRM (hrcc-crm) is where listings are researched and approved. Its
-- `php artisan directory:publish` command copies Active listings here; the
-- website reads this table. Only public fields live here: no ratings,
-- research notes, registration numbers or claim evidence.
--
-- Grants are explicit because of Supabase's 2026-10-30 change (new tables are
-- no longer opened to the API automatically).
-- ============================================================

create table if not exists public.directory_listings (
  id                uuid primary key default gen_random_uuid(),
  crm_id            bigint unique not null,          -- directory_businesses.id in the CRM
  slug              text unique not null,            -- URL: /directory/<state>/<slug>
  name              text not null,
  website_url       text not null,
  description       text,
  public_email      text,
  phone             text,
  city              text,
  state_code        char(2),
  postal_code       text,
  primary_category  text not null,
  categories        text[] not null default '{}',
  services          text[] not null default '{}',
  service_areas     text[] not null default '{}',    -- state codes the firm serves
  nationwide        boolean not null default false,
  remote_available  boolean not null default false,
  industries_served text[] not null default '{}',    -- e.g. healthcare, manufacturing
  company_sizes     text[] not null default '{}',    -- e.g. 1-49, 50-249, 250+
  logo_url          text,
  social_links      jsonb not null default '{}',     -- {"linkedin": "...", "facebook": "..."}
  tier              text not null default 'listed' check (tier in ('top_rated', 'listed')),
  google_maps_url   text,                            -- link to the Google profile (no copied ratings)
  is_claimed        boolean not null default false,
  is_sponsor        boolean not null default false,
  published_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists directory_listings_state_idx on public.directory_listings (state_code);
create index if not exists directory_listings_areas_idx on public.directory_listings using gin (service_areas);
create index if not exists directory_listings_services_idx on public.directory_listings using gin (services);

alter table public.directory_listings enable row level security;

drop policy if exists "public reads listings" on public.directory_listings;
create policy "public reads listings" on public.directory_listings
  for select to anon, authenticated using (true);

revoke all on public.directory_listings from anon, authenticated;
grant select on public.directory_listings to anon, authenticated;
grant select, insert, update, delete on public.directory_listings to service_role;

-- Check: should return 0 rows the first time.
select count(*) as listings from public.directory_listings;
