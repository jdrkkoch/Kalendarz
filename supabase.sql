-- Uruchom w Supabase: SQL Editor -> New query -> Run

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  date date not null,
  time time not null,
  urgent boolean not null default false,
  created_at timestamptz not null default now()
);

-- IP i dane urządzenia: goście mogą tylko dopisywać, czyta wyłącznie admin
create table public.booking_meta (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  ip text,
  device jsonb,
  created_at timestamptz not null default now()
);

-- IP ustawiane po stronie serwera z nagłówków żądania (klient nie może go podrobić)
create function public.set_booking_meta_ip() returns trigger
language plpgsql as $$
begin
  new.ip := trim(split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    ',', 1));
  return new;
end;
$$;

create trigger booking_meta_set_ip
  before insert on public.booking_meta
  for each row execute function public.set_booking_meta_ip();

alter table public.bookings enable row level security;
alter table public.booking_meta enable row level security;

create policy "bookings: read all" on public.bookings
  for select to anon, authenticated using (true);
create policy "bookings: insert all" on public.bookings
  for insert to anon, authenticated with check (true);
create policy "bookings: admin delete" on public.bookings
  for delete to authenticated using (true);

create policy "meta: insert all" on public.booking_meta
  for insert to anon, authenticated with check (true);
create policy "meta: admin read" on public.booking_meta
  for select to authenticated using (true);
