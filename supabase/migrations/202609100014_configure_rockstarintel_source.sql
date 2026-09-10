-- Verified third-party GTA feed. It remains TRUSTED_MEDIA, never OFFICIAL.
do $$
begin
  if not exists (select 1 from public.sources where url='https://rockstarintel.com/category/rockstar-games/feed/') then
    insert into public.sources(name,url,source_type,trust_level,enabled,category,fetch_frequency,allowed_hosts,allow_html)
    values ('RockstarINTEL — Rockstar Games','https://rockstarintel.com/category/rockstar-games/feed/','RSS','TRUSTED_MEDIA',true,'NEWS',30,array['rockstarintel.com'],false);
  end if;
end $$;
