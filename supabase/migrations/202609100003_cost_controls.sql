create table public.ai_extractions (
  cache_key text primary key, content_hash text not null, model text not null, schema_version text not null,
  result jsonb not null, input_tokens integer not null default 0, output_tokens integer not null default 0,
  created_at timestamptz not null default now(), expires_at timestamptz not null
);
alter table public.ai_extractions enable row level security;
revoke all on public.ai_extractions from anon,authenticated;
grant all on public.ai_extractions to service_role;
create index ai_extractions_expiry_idx on public.ai_extractions(expires_at);

create function public.try_attach_duplicate(p_run_id uuid,p_owner uuid,p_source_id uuid,p_item jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare src public.sources; target public.articles; old_trust text; match_kind text;
  incoming_url text:=p_item->>'url'; incoming_hash text:=p_item->>'content_hash';
begin
  perform 1 from public.ingestion_leases where key='news-sync' and owner=p_owner and expires_at>clock_timestamp() for update;
  if not found then raise exception 'Ingestion lease lost'; end if;
  perform 1 from public.automation_runs where id=p_run_id and owner=p_owner and status='RUNNING';
  if not found then raise exception 'Invalid ingestion run'; end if;
  select * into src from public.sources where id=p_source_id and enabled for share;
  if not found then raise exception 'Source disabled or missing'; end if;
  if public.url_host(incoming_url) is null or not(public.url_host(incoming_url)=any(src.allowed_hosts)) then raise exception 'Item URL is outside source allowlist'; end if;
  if src.trust_level='OFFICIAL' and (not public.is_official_url(src.url) or not public.is_official_url(incoming_url)) then raise exception 'Official ownership check failed'; end if;
  if exists(select 1 from public.source_items where source_id=src.id and canonical_url=incoming_url and content_hash=incoming_hash and status in ('PROCESSED','IGNORED')) then
    return jsonb_build_object('action','skipped');
  end if;
  -- Corrections at the same canonical URL always need a new extraction.
  if exists(select 1 from public.source_items where canonical_url=incoming_url and content_hash<>incoming_hash and status='PROCESSED')
    or exists(select 1 from public.articles where source_url=incoming_url and content_hash is distinct from incoming_hash) then
    return jsonb_build_object('action','needs_extraction');
  end if;
  select * into target from public.articles where content_hash=incoming_hash order by created_at limit 1 for update;
  if found then match_kind:='hash'; else
    select * into target from public.articles where title_fingerprint=p_item->>'title_fingerprint'
      and length(title_fingerprint)>=25
      and abs(extract(epoch from(coalesce(published_at,created_at)-coalesce((p_item->>'published_at')::timestamptz,now()))))<=1209600
      order by created_at limit 1 for update;
    match_kind:='title';
  end if;
  if target.id is null then return jsonb_build_object('action','needs_extraction'); end if;
  select trust_level into old_trust from public.sources where id=target.primary_source_id;
  old_trust:=coalesce(old_trust,case when target.verification_status='CONFIRMED' then 'OFFICIAL' else 'UNVERIFIED' end);
  if public.trust_rank(src.trust_level)>public.trust_rank(old_trust)
    or (src.trust_level='OFFICIAL' and match_kind='title' and target.content_hash<>incoming_hash)
    or target.status='REVIEW' then return jsonb_build_object('action','needs_extraction'); end if;
  insert into public.article_sources(article_id,source_id,source_url,source_name,trust_level,content_hash)
    values(target.id,src.id,incoming_url,src.name,src.trust_level,incoming_hash)
    on conflict(article_id,source_url) do update set last_seen_at=now(),content_hash=excluded.content_hash,trust_level=excluded.trust_level;
  insert into public.source_items(source_id,external_id,canonical_url,title,content_hash,title_fingerprint,published_at,modified_at,article_id,run_id)
    values(src.id,p_item->>'external_id',incoming_url,p_item->>'title',incoming_hash,p_item->>'title_fingerprint',
      (p_item->>'published_at')::timestamptz,(p_item->>'modified_at')::timestamptz,target.id,p_run_id)
    on conflict(source_id,canonical_url,content_hash) do update set status='PROCESSED',article_id=excluded.article_id,last_error=null;
  return jsonb_build_object('action','attached','article_id',target.id,'match',match_kind);
end $$;
revoke all on function public.try_attach_duplicate(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.try_attach_duplicate(uuid,uuid,uuid,jsonb) to service_role;
