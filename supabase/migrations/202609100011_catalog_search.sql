alter table public.guides add column search_document tsvector
generated always as (to_tsvector('simple',title || ' ' || description)) stored;
create index guides_search_document_idx on public.guides using gin(search_document);
