create extension if not exists "uuid-ossp";

create table if not exists public.roles (
  id text primary key,
  name text not null,
  avatar_url text,
  hero_image_url text,
  persona text,
  mood text,
  greeting text,
  title text,
  city text,
  description text,
  tags text[] not null default '{}',
  script text[] not null default '{}',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.explore_items (
  id text primary key,
  type text not null check (type in ('post', 'world')),
  title text not null,
  summary text,
  post_type text,
  world_type text,
  location text,
  tags text[] not null default '{}',
  author_name text,
  author_label text,
  author_avatar_url text,
  images text[] not null default '{}',
  cover_height integer,
  stats jsonb not null default '{}'::jsonb,
  content text[] not null default '{}',
  world jsonb not null default '{}'::jsonb,
  target_role_id text references public.roles(id) on delete set null,
  recommended_roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_theater_templates (
  id text primary key,
  title text not null,
  description text,
  scene text,
  target_role_id text references public.roles(id) on delete set null,
  kickoff_prompt text,
  difficulty text,
  target_words text[] not null default '{}',
  reward_points integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_theater_tasks (
  id uuid primary key default uuid_generate_v4(),
  day_key date not null,
  template_id text references public.daily_theater_templates(id) on delete set null,
  title text,
  description text,
  scene text,
  target_role_id text references public.roles(id) on delete set null,
  kickoff_prompt text,
  difficulty text,
  target_words text[] not null default '{}',
  reward_points integer not null default 5,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_seed_messages (
  id uuid primary key default uuid_generate_v4(),
  role_id text references public.roles(id) on delete cascade,
  conversation_id text not null,
  position integer not null default 0,
  sender text not null check (sender in ('user', 'ai')),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, position)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger roles_set_updated_at
before update on public.roles
for each row
execute function public.set_updated_at();

create trigger explore_items_set_updated_at
before update on public.explore_items
for each row
execute function public.set_updated_at();

create trigger daily_theater_templates_set_updated_at
before update on public.daily_theater_templates
for each row
execute function public.set_updated_at();

create trigger daily_theater_tasks_set_updated_at
before update on public.daily_theater_tasks
for each row
execute function public.set_updated_at();

create trigger role_seed_messages_set_updated_at
before update on public.role_seed_messages
for each row
execute function public.set_updated_at();
