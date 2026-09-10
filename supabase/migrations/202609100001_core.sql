-- Los Santos Wire: apply with `supabase db push`. No live news or sources are seeded.
create table public.sources (
  id uuid primary key default gen_random_uuid(), name text not null, url text not null,
  source_type text not null check (source_type in ('RSS','HTML','JSON','YOUTUBE','COMMUNITY')),
  trust_level text not null default 'UNVERIFIED' check (trust_level in ('OFFICIAL','TRUSTED_MEDIA','COMMUNITY','UNVERIFIED')),
  enabled boolean not null default false, category text not null default 'NEWS',
  fetch_frequency integer not null default 30 check (fetch_frequency between 5 and 10080),
  last_checked_at timestamptz, last_successful_fetch_at timestamptz, failure_count integer not null default 0,
  allowed_hosts text[] not null default '{}', allow_html boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (source_type <> 'HTML' or allow_html),
  check (source_type <> 'COMMUNITY' or trust_level = 'COMMUNITY')
);
create table public.articles (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  excerpt text not null default '', content text not null default '',
  game text not null default 'GTA_ONLINE' check (game in ('GTA_ONLINE','GTA_6','GTA_5','ROCKSTAR')),
  category text not null default 'NEWS',
  status text not null default 'DRAFT' check (status in ('DRAFT','REVIEW','PUBLISHED','ARCHIVED')),
  verification_status text not null default 'UNKNOWN' check (verification_status in ('CONFIRMED','REPORTED','RUMOR','UNKNOWN')),
  source_url text not null, source_name text not null,
  published_at timestamptz, updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
  featured_image text, image_alt text, seo_title text, seo_description text,
  keywords text[] not null default '{}', entities text[] not null default '{}',
  featured boolean not null default false, trending boolean not null default false,
  breaking boolean not null default false, breaking_expires_at timestamptz,
  confidence_score numeric not null default 0 check (confidence_score between 0 and 100),
  is_seed boolean not null default false, views bigint not null default 0 check (views >= 0),
  story_key text, content_hash text, title_fingerprint text, primary_source_id uuid references public.sources(id) on delete set null,
  search_document tsvector generated always as (to_tsvector('english', title || ' ' || excerpt || ' ' || content)) stored,
  review_reason text, editorial_locked boolean not null default false,
  check (not breaking or breaking_expires_at is not null),
  check (status <> 'PUBLISHED' or (published_at is not null and verification_status <> 'UNKNOWN'))
);
create index articles_public_idx on public.articles (status, published_at desc);
create index articles_story_key_idx on public.articles (story_key);
create index articles_hash_idx on public.articles (content_hash);
create index articles_source_url_idx on public.articles (source_url);
create index articles_search_idx on public.articles using gin (search_document);
create table public.article_sources (
  id uuid primary key default gen_random_uuid(), article_id uuid not null references public.articles(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null, source_url text not null, source_name text not null,
  trust_level text not null, content_hash text not null, evidence jsonb not null default '[]',
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  unique(article_id, source_url)
);
create index article_sources_url_idx on public.article_sources(source_url);
create table public.article_revisions (
  id uuid primary key default gen_random_uuid(), article_id uuid not null references public.articles(id) on delete cascade,
  snapshot jsonb not null, reason text not null, actor text not null, created_at timestamptz not null default now()
);
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(), idempotency_key text not null unique,
  status text not null default 'RUNNING' check (status in ('RUNNING','SUCCESS','PARTIAL','FAILED','ABANDONED')),
  owner uuid not null, source_id uuid references public.sources(id) on delete set null,
  started_at timestamptz not null default now(), finished_at timestamptz,
  processed_count integer not null default 0, skipped_count integer not null default 0, failed_count integer not null default 0,
  summary jsonb not null default '{}'
);
create table public.automation_logs (
  id uuid primary key default gen_random_uuid(), run_id uuid references public.automation_runs(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  level text not null check (level in ('INFO','WARN','ERROR')), event text not null, message text not null,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index automation_logs_recent_idx on public.automation_logs(created_at desc);
create table public.source_items (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references public.sources(id) on delete cascade,
  external_id text not null, canonical_url text not null, title text not null,
  content_hash text not null, title_fingerprint text not null,
  published_at timestamptz, modified_at timestamptz,
  status text not null default 'PROCESSED' check (status in ('PROCESSED','FAILED','IGNORED')),
  attempts integer not null default 1, last_error text,
  article_id uuid references public.articles(id) on delete set null, run_id uuid references public.automation_runs(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(source_id, canonical_url, content_hash)
);
create table public.weekly_updates (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  event_start timestamptz not null, event_end timestamptz not null,
  last_checked_at timestamptz not null default now(), source_url text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  is_seed boolean not null default false, data jsonb not null default '{}',
  status text not null default 'DRAFT' check (status in ('DRAFT','REVIEW','PUBLISHED','ARCHIVED')),
  verification_status text not null default 'UNKNOWN' check (verification_status in ('CONFIRMED','REPORTED','RUMOR','UNKNOWN')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (event_end > event_start and event_end <= event_start + interval '21 days'),
  check (status <> 'PUBLISHED' or verification_status = 'CONFIRMED'),
  unique(article_id, event_start)
);
create index weekly_current_idx on public.weekly_updates(status, verification_status, event_start desc, event_end);
create table public.vehicles (
  confidence_score numeric not null default 0 check(confidence_score between 0 and 100),
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, vehicle_class text not null,
  price numeric check(price >= 0), top_speed numeric check(top_speed >= 0), retailer text, seats integer check(seats > 0),
  image text, description text not null default '', source_url text, verified_at timestamptz,
  is_seed boolean not null default false, features text[] not null default '{}', added_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.vehicle_prices (
  id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  price numeric not null check(price >= 0), retailer text, source_url text not null, verified_at timestamptz not null,
  recorded_at timestamptz not null default now()
);
create table public.guides (
  confidence_score numeric not null default 0 check(confidence_score between 0 and 100),
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  kind text not null check(kind in ('HEIST','GUIDE','CHARACTER','LOCATION','TRAILER','FEATURE')),
  game text not null default 'GTA_ONLINE', description text not null default '', content text not null default '',
  facts jsonb not null default '{}', source_url text, verified_at timestamptz,
  verification_status text not null default 'UNKNOWN' check(verification_status in ('CONFIRMED','REPORTED','RUMOR','UNKNOWN')),
  is_seed boolean not null default false, image text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.site_settings (
  id text primary key default 'default' check(id = 'default'), release_date timestamptz, release_source_url text, release_verified_at timestamptz,
  auto_publish_official boolean not null default false, auto_publish_trusted boolean not null default false,
  auto_publish_community boolean not null default false, confidence_threshold numeric not null default 90 check(confidence_threshold between 0 and 100),
  site_name text not null default 'Los Santos Wire', updated_at timestamptz not null default now(),
  check(release_date is null or (release_source_url is not null and release_verified_at is not null))
);
insert into public.site_settings(id) values ('default');
create table public.ingestion_leases (
  key text primary key, owner uuid not null, expires_at timestamptz not null, acquired_at timestamptz not null default now()
);
create table public.cache_entries (
  key text primary key, value jsonb not null, expires_at timestamptz not null, updated_at timestamptz not null default now()
);
create index cache_expiry_idx on public.cache_entries(expires_at);

-- Reads and writes go through the application's server. An authenticated user
-- is not implicitly an administrator. Service credentials never reach browsers.
do $$ declare t text; begin
  foreach t in array array['sources','articles','article_sources','article_revisions','automation_runs','automation_logs','source_items','weekly_updates','vehicles','vehicle_prices','guides','site_settings','ingestion_leases','cache_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name='articles' and (to_jsonb(new)-'views'-'updated_at'-'search_document')=(to_jsonb(old)-'views'-'updated_at'-'search_document') then
    new.updated_at:=old.updated_at; return new;
  end if;
  new.updated_at := clock_timestamp(); return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['sources','articles','source_items','weekly_updates','vehicles','guides','site_settings'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

create function public.is_official_url(p_url text) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_url ~ '^https://(www\.)?rockstargames\.com(/|$|\?)|^https://support\.rockstargames\.com(/|$|\?)', false)
$$;
create function public.url_host(p_url text) returns text language sql immutable set search_path = '' as $$
  select substring(p_url from '^https://([a-z0-9.-]+)(?:/|$|\?)')
$$;
create function public.trust_rank(p_trust text) returns integer language sql immutable set search_path = '' as $$
  select case p_trust when 'OFFICIAL' then 3 when 'TRUSTED_MEDIA' then 2 when 'COMMUNITY' then 1 else 0 end
$$;
create function public.title_similarity(p_a text,p_b text) returns numeric language sql immutable set search_path = '' as $$
  with a as (select distinct unnest(regexp_split_to_array(lower(p_a),'[^[:alnum:]]+')) token),
       b as (select distinct unnest(regexp_split_to_array(lower(p_b),'[^[:alnum:]]+')) token),
       all_tokens as (select token from a where token<>'' union select token from b where token<>''),
       common_tokens as (select token from a where token<>'' intersect select token from b where token<>'')
  select case when (select count(*) from all_tokens) < 4 then 0 else
    (select count(*)::numeric from common_tokens) / nullif((select count(*) from all_tokens),0) end
$$;

create function public.acquire_ingestion_lease(p_key text,p_owner uuid,p_ttl_seconds integer default 120) returns boolean
language plpgsql set search_path = '' as $$
declare acquired boolean; begin
  insert into public.ingestion_leases(key,owner,expires_at) values(p_key,p_owner,clock_timestamp()+make_interval(secs=>least(greatest(p_ttl_seconds,30),300)))
  on conflict(key) do update set owner=excluded.owner,expires_at=excluded.expires_at,acquired_at=clock_timestamp()
  where public.ingestion_leases.expires_at <= clock_timestamp()
  returning true into acquired;
  return coalesce(acquired,false);
end $$;
create function public.renew_ingestion_lease(p_key text,p_owner uuid,p_ttl_seconds integer default 120) returns boolean
language plpgsql set search_path = '' as $$
begin
  update public.ingestion_leases set expires_at=clock_timestamp()+make_interval(secs=>least(greatest(p_ttl_seconds,30),300))
  where key=p_key and owner=p_owner and expires_at>clock_timestamp();
  return found;
end $$;
create function public.release_ingestion_lease(p_key text,p_owner uuid) returns boolean language plpgsql set search_path = '' as $$
begin delete from public.ingestion_leases where key=p_key and owner=p_owner; return found; end $$;

create function public.validate_editorial_provenance() returns trigger language plpgsql set search_path = '' as $$
declare source_trust text; begin
  if tg_op='UPDATE' and new.source_url is not distinct from old.source_url
    and new.verification_status is not distinct from old.verification_status
    and new.confidence_score is not distinct from old.confidence_score
    and new.is_seed is not distinct from old.is_seed
    and not(new.status='PUBLISHED' and old.status<>'PUBLISHED') then return new; end if;
  if new.is_seed then
    if new.title not like '[FICTIONAL TEST]%' then raise exception 'Seed articles must be explicitly fictional'; end if;
    if new.verification_status='CONFIRMED' then raise exception 'Fictional articles cannot be confirmed'; end if;
    return new;
  end if;
  if new.verification_status='CONFIRMED' and not public.is_official_url(new.source_url) then raise exception 'CONFIRMED requires approved official URL'; end if;
  if new.status='PUBLISHED' then
    select s.trust_level into source_trust from public.sources s where s.enabled
      and public.url_host(new.source_url)=any(s.allowed_hosts)
      and public.url_host(s.url)=any(s.allowed_hosts)
      and (s.trust_level<>'OFFICIAL' or (public.is_official_url(s.url) and public.is_official_url(new.source_url)))
      order by public.trust_rank(s.trust_level) desc limit 1;
    if source_trust is null or source_trust='UNVERIFIED' then raise exception 'Publishing requires a configured enabled attributable source'; end if;
    if new.verification_status='CONFIRMED' and source_trust<>'OFFICIAL' then raise exception 'CONFIRMED requires official source authority'; end if;
    if new.confidence_score<(select confidence_threshold from public.site_settings where id='default') then raise exception 'Confidence below publication threshold'; end if;
  end if;
  return new;
end $$;
create trigger article_provenance before insert or update on public.articles for each row execute function public.validate_editorial_provenance();

create function public.admin_edit_article(p_article_id uuid,p_patch jsonb,p_actor text,p_expected_updated_at timestamptz default null)
returns public.articles language plpgsql set search_path = '' as $$
declare previous public.articles; result public.articles; merged public.articles; begin
  select * into previous from public.articles where id=p_article_id for update;
  if not found then raise exception 'Article not found'; end if;
  if p_expected_updated_at is not null and previous.updated_at<>p_expected_updated_at then raise exception 'Article changed. Reload before editing.'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('title','slug','excerpt','content','game','category','status','verification_status','source_url','source_name','published_at','featured_image','image_alt','seo_title','seo_description','keywords','entities','featured','trending','breaking','breaking_expires_at','confidence_score','review_reason')) then raise exception 'Unsupported article field'; end if;
  if length(trim(p_actor))=0 then raise exception 'Editor identity required'; end if;
  merged:=jsonb_populate_record(previous,p_patch);
  insert into public.article_revisions(article_id,snapshot,reason,actor) values(previous.id,to_jsonb(previous),'admin_edit',p_actor);
  update public.articles set title=merged.title,slug=merged.slug,excerpt=merged.excerpt,content=merged.content,game=merged.game,
    category=merged.category,status=merged.status,verification_status=merged.verification_status,source_url=merged.source_url,
    source_name=merged.source_name,published_at=case when merged.status='PUBLISHED' then coalesce(merged.published_at,now()) else merged.published_at end,
    featured_image=merged.featured_image,image_alt=merged.image_alt,seo_title=merged.seo_title,seo_description=merged.seo_description,
    keywords=merged.keywords,entities=merged.entities,featured=merged.featured,trending=merged.trending,breaking=merged.breaking,
    breaking_expires_at=merged.breaking_expires_at,confidence_score=merged.confidence_score,review_reason=merged.review_reason,
    editorial_locked=true where id=p_article_id returning * into result;
  delete from public.cache_entries;
  return result;
end $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default: revoke explicitly, including
-- authenticated/anon inherited grants, then grant only the server role.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
