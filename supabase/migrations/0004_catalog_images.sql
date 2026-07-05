-- Images for saved services.
alter table public.catalog_items add column image_url text;

-- Public storage bucket for catalog images.
insert into storage.buckets (id, name, public) values ('catalog', 'catalog', true);

-- Manager+ can upload/replace/delete catalog images; anyone can view (public bucket).
create policy catalog_images_insert on storage.objects for insert
  with check (bucket_id = 'catalog' and public.current_rank() >= 3);
create policy catalog_images_update on storage.objects for update
  using (bucket_id = 'catalog' and public.current_rank() >= 3);
create policy catalog_images_delete on storage.objects for delete
  using (bucket_id = 'catalog' and public.current_rank() >= 3);
create policy catalog_images_select on storage.objects for select
  using (bucket_id = 'catalog');
