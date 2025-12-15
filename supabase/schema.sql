-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists media_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (char_length(source) > 0),
  source_id text not null,
  type text not null,
  title text not null,
  poster_url text,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);

create table if not exists user_media (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null,
  media_id uuid not null references media_items(id) on delete cascade,
  status text not null default 'Planning',
  user_rating numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_identifier, media_id)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_media_updated_at on user_media;
create trigger user_media_updated_at
before update on user_media
for each row
execute procedure public.set_updated_at();

alter table user_media enable row level security;

create policy "Users can manage their entries"
on user_media
for all
using (auth.uid()::text = user_identifier)
with check (auth.uid()::text = user_identifier);



