-- Wattly — Supabase / Postgres schema
-- Run in SQL editor after creating project, or via supabase db push

-- Profiles (1:1 with auth.users) — onboarding & carbon calibration
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  home_size_sqft int default 1500,
  num_rooms int default 3,
  country text default 'US',
  monthly_bill_usd numeric default 120,
  -- Grid average g CO2 / kWh — user can override after onboarding
  grid_carbon_g_per_kwh numeric default 386,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Physical devices (Arduino) mapped to a user home
create table if not exists public.devices (
  id text primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  room_id text default 'living-room',
  room_label text default 'Living Room',
  created_at timestamptz default now()
);

-- User-tunable alert thresholds
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  temp_threshold_high_c numeric default 24,
  light_threshold int default 400,
  noise_threshold int default 600,
  motion_absence_alert_mins int default 30,
  updated_at timestamptz default now()
);

-- Time-series sensor readings (from Arduino POST)
create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  device_id text references public.devices (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  room_id text not null default 'living-room',
  temperature_c numeric not null,
  light_level int not null,
  sound_level int not null,
  motion_detected boolean not null default false,
  waste_score int not null check (waste_score >= 0 and waste_score <= 100),
  carbon_grams_est numeric default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_readings_user_time on public.sensor_readings (user_id, recorded_at desc);
create index if not exists idx_readings_device_time on public.sensor_readings (device_id, recorded_at desc);

-- Gamification (optional)
create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak_days int default 0,
  best_streak_days int default 0,
  last_green_date date,
  badges text[] default '{}',
  updated_at timestamptz default now()
);

-- RLS (enable after policies — service role bypasses for API)
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.user_settings enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.user_streaks enable row level security;

-- Example policies: users read/write own rows (adjust for your app)
create policy "Users own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users own devices" on public.devices
  for all using (auth.uid() = user_id);

create policy "Users own settings" on public.user_settings
  for all using (auth.uid() = user_id);

create policy "Users own readings" on public.sensor_readings
  for select using (auth.uid() = user_id);

create policy "Users own streaks" on public.user_streaks
  for all using (auth.uid() = user_id);

-- Insert from Arduino uses service role key (server-side only), not RLS client
