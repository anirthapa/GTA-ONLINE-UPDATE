-- Public reference sources reviewed for the accumulation adapters.
-- HTML ingestion is explicitly enabled here; operators should still confirm
-- current publisher terms/robots guidance before deploying the scheduler.
do $$
begin
  if not exists (select 1 from public.sources where url='https://www.gtabase.com/gta-online/weekly-update-bonuses-discounts') then
    insert into public.sources(name,url,source_type,trust_level,enabled,category,fetch_frequency,allowed_hosts,allow_html)
    values ('GTABase — GTA Online event week','https://www.gtabase.com/gta-online/weekly-update-bonuses-discounts','HTML','TRUSTED_MEDIA',true,'WEEKLY_UPDATE',10080,array['www.gtabase.com'],true);
  end if;
  if not exists (select 1 from public.sources where url='https://www.gtabase.com/grand-theft-auto-v/vehicles/') then
    insert into public.sources(name,url,source_type,trust_level,enabled,category,fetch_frequency,allowed_hosts,allow_html)
    values ('GTABase — vehicle catalog','https://www.gtabase.com/grand-theft-auto-v/vehicles/','HTML','TRUSTED_MEDIA',true,'VEHICLES',10080,array['www.gtabase.com'],true);
  end if;
end $$;

-- Rockstar's current official GTA VI page displays November 19, 2026. Only
-- fill an unset value; preserve a later editor decision if settings already
-- contain a verified date.
update public.site_settings
set release_date='2026-11-19T00:00:00Z'::timestamptz,
    release_source_url='https://www.rockstargames.com/VI',
    release_verified_at=clock_timestamp()
where id='default' and release_date is null;
