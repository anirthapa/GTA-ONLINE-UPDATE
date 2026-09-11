-- Stable vehicle identities and event-scoped offers. Public reads remain server-only.
alter table public.vehicles
  add column model_name text,
  add column manufacturer text,
  add column trade_price numeric check (trade_price >= 0),
  add column gallery text[] not null default '{}',
  add column specifications jsonb not null default '{}' check (jsonb_typeof(specifications) = 'object');
create table public.vehicle_aliases (
  alias text primary key check (alias = lower(trim(alias)) and length(alias) > 0),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  source_url text not null,
  verified_at timestamptz not null default now()
);
create index vehicle_alias_vehicle_idx on public.vehicle_aliases(vehicle_id);
create table public.weekly_vehicle_offers (
  weekly_update_id uuid not null references public.weekly_updates(id) on delete cascade,
  name text not null,
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  discount_text text not null,
  discount_percent numeric check (discount_percent between 0 and 100),
  sale_price numeric check (sale_price >= 0),
  position integer not null default 0,
  primary key (weekly_update_id, name)
);
create index weekly_offers_vehicle_idx on public.weekly_vehicle_offers(vehicle_id);
alter table public.vehicle_aliases enable row level security;
alter table public.weekly_vehicle_offers enable row level security;
revoke all on public.vehicle_aliases, public.weekly_vehicle_offers from anon, authenticated;
grant all on public.vehicle_aliases, public.weekly_vehicle_offers to service_role;
create policy deny_client_aliases on public.vehicle_aliases for all to anon, authenticated using(false) with check(false);
create policy deny_client_offers on public.weekly_vehicle_offers for all to anon, authenticated using(false) with check(false);

create function public.sync_weekly_vehicle_offers() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.weekly_vehicle_offers where weekly_update_id=new.id;
  insert into public.weekly_vehicle_offers(weekly_update_id,name,vehicle_id,discount_text,discount_percent,sale_price,position)
  select new.id, item->>'name', a.vehicle_id, item->>'discount',
    substring(item->>'discount' from '([0-9]+(?:[.][0-9]+)?)%')::numeric,
    replace(substring(item->>'discount' from 'GTA[$][ ]*([0-9,]+)'),',','')::numeric,
    ord::integer
  from jsonb_array_elements(coalesce(new.data->'vehicleDiscounts','[]'::jsonb)) with ordinality d(item,ord)
  left join public.vehicle_aliases a on a.alias=lower(trim(item->>'name'))
  where length(trim(item->>'name')) > 0 and item->>'discount' is not null
  on conflict (weekly_update_id,name) do nothing;
  return new;
end $$;
create trigger sync_weekly_offers after insert or update of data on public.weekly_updates
for each row execute function public.sync_weekly_vehicle_offers();
create function public.link_vehicle_alias_offers() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update public.weekly_vehicle_offers set vehicle_id=new.vehicle_id where lower(trim(name))=new.alias;
  return new;
end $$;
create trigger link_vehicle_alias after insert or update on public.vehicle_aliases
for each row execute function public.link_vehicle_alias_offers();
revoke all on function public.sync_weekly_vehicle_offers(), public.link_vehicle_alias_offers() from public, anon, authenticated;
grant execute on function public.sync_weekly_vehicle_offers(), public.link_vehicle_alias_offers() to service_role;
-- Backfill existing events through the same trigger used by future imports.
update public.weekly_updates set data=data;
