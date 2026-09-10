create function public.ingest_source_item(
  p_run_id uuid,p_owner uuid,p_source_id uuid,p_item jsonb,p_article jsonb,p_weekly jsonb default null
) returns jsonb language plpgsql set search_path = '' as $$
declare
  src public.sources; previous public.articles; result public.articles; settings public.site_settings;
  old_trust text; target_id uuid; match_kind text; next_verification text; next_status text;
  incoming_url text:=p_item->>'url'; incoming_hash text:=p_item->>'content_hash';
  collision boolean:=false; changed boolean:=false; incoming_date timestamptz;
begin
  -- Row lock is the fencing boundary. An expired worker cannot write after a
  -- replacement acquired the durable lease, even if its network request finished.
  perform 1 from public.ingestion_leases where key='news-sync' and owner=p_owner and expires_at>clock_timestamp() for update;
  if not found then raise exception 'Ingestion lease lost'; end if;
  perform 1 from public.automation_runs where id=p_run_id and owner=p_owner and status='RUNNING';
  if not found then raise exception 'Invalid ingestion run'; end if;
  select * into src from public.sources where id=p_source_id and enabled for share;
  if not found then raise exception 'Source disabled or missing'; end if;
  if public.url_host(incoming_url) is null or not(public.url_host(incoming_url)=any(src.allowed_hosts)) then raise exception 'Item URL is outside source allowlist'; end if;
  if src.trust_level='OFFICIAL' and (not public.is_official_url(src.url) or not public.is_official_url(incoming_url)) then raise exception 'Official ownership check failed'; end if;
  if exists(select 1 from public.source_items where source_id=src.id and canonical_url=incoming_url and content_hash=incoming_hash and status in ('PROCESSED','IGNORED')) then
    return jsonb_build_object('action','skipped','reason','already_processed');
  end if;
  select * into settings from public.site_settings where id='default';
  next_verification:=case when src.trust_level='OFFICIAL' then 'CONFIRMED' when coalesce((p_article->>'rumor')::boolean,false) then 'RUMOR' when src.trust_level='UNVERIFIED' then 'UNKNOWN' else 'REPORTED' end;
  next_status:=case
    when src.trust_level='UNVERIFIED' then 'REVIEW'
    when coalesce((p_article->>'needs_review')::boolean,false) or coalesce((p_article->>'rumor')::boolean,false) or
      (p_article->>'confidence_score')::numeric < settings.confidence_threshold then 'REVIEW'
    when src.trust_level='OFFICIAL' and settings.auto_publish_official then 'PUBLISHED'
    when src.trust_level='TRUSTED_MEDIA' and settings.auto_publish_trusted then 'PUBLISHED'
    when src.trust_level='COMMUNITY' and settings.auto_publish_community then 'PUBLISHED'
    else 'DRAFT' end;
  if not coalesce((p_article->>'relevant')::boolean,false) then
    insert into public.source_items(source_id,external_id,canonical_url,title,content_hash,title_fingerprint,status,run_id)
      values(src.id,p_item->>'external_id',incoming_url,p_item->>'title',incoming_hash,p_item->>'title_fingerprint','IGNORED',p_run_id)
      on conflict(source_id,canonical_url,content_hash) do update set status='IGNORED',updated_at=now();
    return jsonb_build_object('action','skipped','reason','irrelevant');
  end if;
  incoming_date:=coalesce((p_item->>'published_at')::timestamptz,now());
  -- Prefer strong identities. Story keys alone are not sufficient: repeated
  -- weekly headlines and model collisions must not overwrite unrelated stories.
  select a.id,'url' into target_id,match_kind from public.articles a
    where a.source_url=incoming_url or exists(select 1 from public.article_sources s where s.article_id=a.id and s.source_url=incoming_url)
    order by a.created_at limit 1;
  if target_id is null then
    select id,'hash' into target_id,match_kind from public.articles where content_hash=incoming_hash order by created_at limit 1;
  end if;
  if target_id is null then
    select id,'title' into target_id,match_kind from public.articles
    where game=p_article->>'game' and abs(extract(epoch from(coalesce(published_at,created_at)-incoming_date)))<=1209600
      and public.title_similarity(title_fingerprint,p_item->>'title_fingerprint')>=0.82
    order by public.title_similarity(title_fingerprint,p_item->>'title_fingerprint') desc limit 1;
  end if;
  if target_id is null then
    select id,'story' into target_id,match_kind from public.articles
    where story_key=p_article->>'story_key' and game=p_article->>'game'
      and abs(extract(epoch from(coalesce(published_at,created_at)-incoming_date)))<=1209600
      and public.title_similarity(title_fingerprint,p_item->>'title_fingerprint')>=0.35
    order by created_at limit 1;
  end if;
  if target_id is null then
    collision:=exists(select 1 from public.articles where story_key=p_article->>'story_key'
      and abs(extract(epoch from(coalesce(published_at,created_at)-incoming_date)))<=1209600);
    insert into public.articles(slug,title,excerpt,content,game,category,status,verification_status,source_url,source_name,
      published_at,keywords,entities,confidence_score,story_key,content_hash,title_fingerprint,primary_source_id,review_reason,seo_title,seo_description)
    values(p_article->>'slug',p_article->>'title',p_article->>'excerpt',p_article->>'content',p_article->>'game',p_article->>'category',
      case when collision then 'REVIEW' else next_status end,next_verification,incoming_url,src.name,
      case when next_status='PUBLISHED' and not collision then coalesce((p_item->>'published_at')::timestamptz,now()) else (p_item->>'published_at')::timestamptz end,
      array(select jsonb_array_elements_text(p_article->'keywords')),array(select jsonb_array_elements_text(p_article->'entities')),
      (p_article->>'confidence_score')::numeric,p_article->>'story_key',incoming_hash,p_item->>'title_fingerprint',src.id,
      case when collision then 'Ambiguous story-key collision; manual review required.' else p_article->>'review_reason' end,
      left(p_article->>'title',70),left(p_article->>'excerpt',180))
      returning * into result;
    changed:=true;
  else
    select * into previous from public.articles where id=target_id for update;
    select trust_level into old_trust from public.sources where id=previous.primary_source_id;
    old_trust:=coalesce(old_trust,case when previous.verification_status='CONFIRMED' then 'OFFICIAL' else 'UNVERIFIED' end);
    -- Same-source corrections and higher-authority evidence create revisions.
    -- Lower-authority sources only attach; they cannot downgrade confirmed facts.
    if not previous.editorial_locked and (public.trust_rank(src.trust_level)>public.trust_rank(old_trust) or
       (previous.source_url=incoming_url and previous.content_hash is distinct from incoming_hash)) then
      insert into public.article_revisions(article_id,snapshot,reason,actor) values(previous.id,to_jsonb(previous),
        case when public.trust_rank(src.trust_level)>public.trust_rank(old_trust) then 'official_or_higher_trust_upgrade' else 'source_correction' end,'ingestion:'||p_run_id);
      update public.articles set title=p_article->>'title',excerpt=p_article->>'excerpt',content=p_article->>'content',
        game=p_article->>'game',category=p_article->>'category',
        status=case when previous.status='ARCHIVED' then 'ARCHIVED' else next_status end,
        verification_status=next_verification,source_url=incoming_url,source_name=src.name,primary_source_id=src.id,
        published_at=coalesce(previous.published_at,(p_item->>'published_at')::timestamptz,case when next_status='PUBLISHED' then now() else null end),
        keywords=array(select jsonb_array_elements_text(p_article->'keywords')),entities=array(select jsonb_array_elements_text(p_article->'entities')),
        confidence_score=(p_article->>'confidence_score')::numeric,content_hash=incoming_hash,title_fingerprint=p_item->>'title_fingerprint',
        story_key=p_article->>'story_key',review_reason=p_article->>'review_reason',
        seo_title=left(p_article->>'title',70),seo_description=left(p_article->>'excerpt',180)
      where id=previous.id returning * into result;
      changed:=true;
    else
      result:=previous;
      if (match_kind='story' and public.trust_rank(src.trust_level)>=public.trust_rank(old_trust)) or
         (src.trust_level='OFFICIAL' and old_trust='OFFICIAL' and previous.content_hash is distinct from incoming_hash and match_kind in ('title','story')) or
         (previous.editorial_locked and previous.content_hash is distinct from incoming_hash and
           (previous.source_url=incoming_url or public.trust_rank(src.trust_level)>public.trust_rank(old_trust))) then
        insert into public.article_revisions(article_id,snapshot,reason,actor) values(previous.id,to_jsonb(previous),'conflicting_evidence','ingestion:'||p_run_id);
        update public.articles set review_reason='New conflicting evidence or locked editorial content requires review.',
          status=case when status='ARCHIVED' then 'ARCHIVED' else 'REVIEW' end where id=previous.id returning * into result;
      end if;
    end if;
  end if;
  insert into public.article_sources(article_id,source_id,source_url,source_name,trust_level,content_hash,evidence)
    values(result.id,src.id,incoming_url,src.name,src.trust_level,incoming_hash,coalesce(p_article->'evidence','[]'::jsonb))
    on conflict(article_id,source_url) do update set last_seen_at=now(),content_hash=excluded.content_hash,
      trust_level=excluded.trust_level,evidence=excluded.evidence;
  insert into public.source_items(source_id,external_id,canonical_url,title,content_hash,title_fingerprint,published_at,modified_at,article_id,run_id)
    values(src.id,p_item->>'external_id',incoming_url,p_item->>'title',incoming_hash,p_item->>'title_fingerprint',
      (p_item->>'published_at')::timestamptz,(p_item->>'modified_at')::timestamptz,result.id,p_run_id)
    on conflict(source_id,canonical_url,content_hash) do update set status='PROCESSED',article_id=excluded.article_id,
      run_id=excluded.run_id,last_error=null,attempts=public.source_items.attempts+1;
  if p_weekly is not null and changed and src.trust_level='OFFICIAL' and result.verification_status='CONFIRMED' then
    insert into public.weekly_updates(slug,event_start,event_end,source_url,article_id,data,status,verification_status)
      values('week-'||left(p_weekly->>'event_start',10)||'-'||left(result.id::text,8),(p_weekly->>'event_start')::timestamptz,
        (p_weekly->>'event_end')::timestamptz,incoming_url,result.id,p_weekly->'data',
        case when (p_weekly->>'event_end')::timestamptz<=now() and result.status='PUBLISHED' then 'ARCHIVED' else result.status end,'CONFIRMED')
      on conflict(article_id,event_start) do update set event_end=excluded.event_end,data=excluded.data,source_url=excluded.source_url,
        status=excluded.status,verification_status=excluded.verification_status,last_checked_at=now();
  end if;
  -- Never retain a public weekly record after the underlying story enters review.
  update public.weekly_updates set status=result.status where article_id=result.id and result.status in ('DRAFT','REVIEW','ARCHIVED');
  delete from public.cache_entries;
  return jsonb_build_object('action',case when target_id is null then 'created' when changed then 'updated' else 'attached' end,'article_id',result.id,'status',result.status);
end $$;

create function public.expire_editorial_content() returns jsonb language plpgsql set search_path = '' as $$
declare weekly_count integer; breaking_count integer; begin
  update public.weekly_updates set status='ARCHIVED' where status='PUBLISHED' and event_end<=clock_timestamp();
  get diagnostics weekly_count=row_count;
  update public.articles set breaking=false where breaking and breaking_expires_at<=clock_timestamp();
  get diagnostics breaking_count=row_count;
  update public.automation_runs set status='ABANDONED',finished_at=clock_timestamp()
    where status='RUNNING' and started_at<clock_timestamp()-interval '5 minutes'
    and not exists(select 1 from public.ingestion_leases l where l.owner=public.automation_runs.owner and l.expires_at>clock_timestamp());
  delete from public.cache_entries where expires_at<=clock_timestamp();
  if weekly_count+breaking_count>0 then delete from public.cache_entries; end if;
  return jsonb_build_object('weekly',weekly_count,'breaking',breaking_count);
end $$;

create function public.invalidate_public_cache() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name='articles' and tg_op='UPDATE' and
    (to_jsonb(new)-'views'-'updated_at'-'search_document')=(to_jsonb(old)-'views'-'updated_at'-'search_document') then return null; end if;
  delete from public.cache_entries; return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['weekly_updates','vehicles','guides','site_settings','sources'] loop
    execute format('create trigger invalidate_public_cache after insert or update or delete on public.%I for each statement execute function public.invalidate_public_cache()',t);
  end loop;
end $$;
create trigger invalidate_public_cache after insert or update or delete on public.articles for each row execute function public.invalidate_public_cache();

create function public.validate_source_ownership() returns trigger language plpgsql set search_path = '' as $$
begin
  if public.url_host(new.url) is null or not(public.url_host(new.url)=any(new.allowed_hosts)) then raise exception 'Source requires exact HTTPS allowlist'; end if;
  if new.trust_level='OFFICIAL' and (not public.is_official_url(new.url) or
    not(new.allowed_hosts <@ array['www.rockstargames.com','rockstargames.com','support.rockstargames.com'])) then raise exception 'Unapproved official source ownership'; end if;
  return new;
end $$;
create trigger source_ownership before insert or update on public.sources for each row execute function public.validate_source_ownership();

create function public.validate_confirmed_reference() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='UPDATE' and (to_jsonb(new)-array['status','last_checked_at','updated_at'])=(to_jsonb(old)-array['status','last_checked_at','updated_at'])
    and not(coalesce(to_jsonb(new)->>'status','')='PUBLISHED' and coalesce(to_jsonb(old)->>'status','')<>'PUBLISHED') then return new; end if;
  if tg_table_name='weekly_updates' and to_jsonb(new)->>'status'='PUBLISHED' and
    not exists(select 1 from public.articles where id=(to_jsonb(new)->>'article_id')::uuid and status='PUBLISHED') then
    raise exception 'Weekly publication requires a published parent article';
  end if;
  if new.verification_status='CONFIRMED' and (new.is_seed or not public.is_official_url(new.source_url) or
    not exists(select 1 from public.sources s where s.enabled and s.trust_level='OFFICIAL' and public.is_official_url(s.url)
      and public.url_host(new.source_url)=any(s.allowed_hosts))) then raise exception 'Confirmed data requires configured official authority'; end if;
  return new;
end $$;
create trigger weekly_provenance before insert or update on public.weekly_updates for each row execute function public.validate_confirmed_reference();
create trigger guide_provenance before insert or update on public.guides for each row execute function public.validate_confirmed_reference();
create function public.synchronize_weekly_visibility() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status<>old.status and new.status in ('DRAFT','REVIEW','ARCHIVED') then
    update public.weekly_updates set status=new.status where article_id=new.id and status<>'ARCHIVED';
  end if;
  return null;
end $$;
create trigger synchronize_weekly_visibility after update of status on public.articles for each row execute function public.synchronize_weekly_visibility();
create function public.validate_release_reference() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.release_date is not null and (not public.is_official_url(new.release_source_url) or
    new.release_verified_at is null or new.release_verified_at>clock_timestamp()) then raise exception 'Release date requires an official reference and valid verification timestamp'; end if;
  return new;
end $$;
create trigger release_provenance before insert or update on public.site_settings for each row execute function public.validate_release_reference();

revoke all on function public.ingest_source_item(uuid,uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_source_item(uuid,uuid,uuid,jsonb,jsonb,jsonb) to service_role;
revoke all on function public.expire_editorial_content() from public,anon,authenticated;
grant execute on function public.expire_editorial_content() to service_role;
revoke all on function public.invalidate_public_cache(),public.validate_source_ownership(),public.validate_confirmed_reference(),public.validate_release_reference(),public.synchronize_weekly_visibility() from public,anon,authenticated;
grant execute on function public.invalidate_public_cache(),public.validate_source_ownership(),public.validate_confirmed_reference(),public.validate_release_reference(),public.synchronize_weekly_visibility() to service_role;
