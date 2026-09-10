-- Preserve the existing function bodies while making their cache cleanup
-- predicates explicit for hosted Supabase DELETE safety checks.
do $$
declare fn text;
begin
  select pg_get_functiondef('public.ingest_source_item(uuid,uuid,uuid,jsonb,jsonb,jsonb)'::regprocedure) into fn;
  execute replace(fn, 'delete from public.cache_entries;', 'delete from public.cache_entries where key is not null;');
  select pg_get_functiondef('public.admin_edit_article(uuid,jsonb,text,timestamptz)'::regprocedure) into fn;
  execute replace(fn, 'delete from public.cache_entries;', 'delete from public.cache_entries where key is not null;');
end $$;
