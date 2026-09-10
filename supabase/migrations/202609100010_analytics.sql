-- Short-lived abuse prevention and aggregate, first-party article analytics.
create table public.rate_limits (
  key text primary key,
  count integer not null default 1,
  expires_at timestamptz not null
);
create index rate_limits_expiry_idx on public.rate_limits(expires_at);
create table public.article_daily_views (
  article_id uuid not null references public.articles(id) on delete cascade,
  day date not null,
  views bigint not null default 0,
  primary key(article_id,day)
);
alter table public.rate_limits enable row level security;
alter table public.article_daily_views enable row level security;
revoke all on public.rate_limits, public.article_daily_views from anon, authenticated;
grant all on public.rate_limits, public.article_daily_views to service_role;

create function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql set search_path='' as $$
declare current_count integer;
begin
  insert into public.rate_limits(key,count,expires_at)
  values(p_key,1,clock_timestamp()+make_interval(secs=>p_seconds))
  on conflict(key) do update set
    count=case when public.rate_limits.expires_at<clock_timestamp() then 1 else public.rate_limits.count+1 end,
    expires_at=case when public.rate_limits.expires_at<clock_timestamp() then excluded.expires_at else public.rate_limits.expires_at end
  returning count into current_count;
  return current_count<=p_limit;
end $$;

create function public.increment_article_view(p_article_id uuid,p_reader_key text) returns boolean
language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.articles where id=p_article_id and status='PUBLISHED' and published_at<=now() and not is_seed) then return false; end if;
  if not public.consume_rate_limit('view:'||p_reader_key||':'||p_article_id::text,1,3600) then return false; end if;
  update public.articles set views=views+1 where id=p_article_id;
  insert into public.article_daily_views(article_id,day,views) values(p_article_id,(now() at time zone 'UTC')::date,1)
  on conflict(article_id,day) do update set views=public.article_daily_views.views+1;
  return true;
end $$;

create function public.get_trending_articles(p_limit integer default 5) returns setof public.articles
language sql stable set search_path='' as $$
  select a.* from public.articles a left join (
    select article_id,sum(views) recent_views from public.article_daily_views
    where day >= (now() at time zone 'UTC')::date-1 group by article_id
  ) v on v.article_id=a.id
  where a.status='PUBLISHED' and not a.is_seed and a.published_at<=now()
  order by (ln(1+coalesce(v.recent_views,0))*3 +
    24/greatest(1,extract(epoch from (now()-a.published_at))/3600) +
    case when a.trending then 15 else 0 end + case when a.featured then 5 else 0 end) desc
  limit least(greatest(p_limit,1),12)
$$;
revoke all on function public.consume_rate_limit(text,integer,integer), public.increment_article_view(uuid,text), public.get_trending_articles(integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer), public.increment_article_view(uuid,text), public.get_trending_articles(integer) to service_role;

create function public.cleanup_transient_records() returns trigger
language plpgsql set search_path='' as $$
begin
  delete from public.rate_limits where expires_at<clock_timestamp()-interval '1 day';
  delete from public.ai_extractions where expires_at<clock_timestamp();
  delete from public.article_daily_views where day<(now() at time zone 'UTC')::date-90;
  return new;
end $$;
create trigger cleanup_transient_records before insert on public.automation_runs
for each statement execute function public.cleanup_transient_records();
revoke all on function public.cleanup_transient_records() from public,anon,authenticated;
grant execute on function public.cleanup_transient_records() to service_role;
