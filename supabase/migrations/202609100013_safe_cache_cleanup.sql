-- Supabase's hosted database rejects unconditional DELETE statements. Keep the
-- cache invalidation semantics while making the delete predicate explicit.
create or replace function public.expire_editorial_content() returns jsonb
language plpgsql set search_path = '' as $$
declare weekly_count integer; breaking_count integer; begin
  update public.weekly_updates set status='ARCHIVED' where status='PUBLISHED' and event_end<=clock_timestamp();
  get diagnostics weekly_count=row_count;
  update public.articles set breaking=false where breaking and breaking_expires_at<=clock_timestamp();
  get diagnostics breaking_count=row_count;
  update public.automation_runs set status='ABANDONED',finished_at=clock_timestamp()
    where status='RUNNING' and started_at<clock_timestamp()-interval '5 minutes'
    and not exists(select 1 from public.ingestion_leases l where l.owner=public.automation_runs.owner and l.expires_at>clock_timestamp());
  delete from public.cache_entries where expires_at<=clock_timestamp();
  if weekly_count+breaking_count>0 then delete from public.cache_entries where key is not null; end if;
  return jsonb_build_object('weekly',weekly_count,'breaking',breaking_count);
end $$;

create or replace function public.invalidate_public_cache() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name='articles' and tg_op='UPDATE' and
    (to_jsonb(new)-'views'-'updated_at'-'search_document')=(to_jsonb(old)-'views'-'updated_at'-'search_document') then return null; end if;
  delete from public.cache_entries where key is not null;
  return null;
end $$;
