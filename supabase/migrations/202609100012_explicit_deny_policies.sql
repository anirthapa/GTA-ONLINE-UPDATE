-- Backend-only publication tables use explicit deny policies so the
-- deny-by-default boundary is visible to Supabase advisors as well as RLS.
-- The application uses service_role from server-only code; service_role
-- bypasses RLS and retains the grants established by the core migrations.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sources','articles','article_sources','article_revisions',
    'automation_runs','automation_logs','source_items','weekly_updates',
    'vehicles','vehicle_prices','guides','site_settings','ingestion_leases',
    'cache_entries','ai_extractions','rate_limits','article_daily_views'
  ] loop
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      'deny_client_access_' || table_name,
      table_name
    );
  end loop;
end $$;
