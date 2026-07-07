alter table public.classrooms
  add column if not exists image_url text;

alter table public.classrooms
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (order by sort_order asc, created_at desc) * 10 as next_sort_order
  from public.classrooms
)
update public.classrooms as classrooms
set sort_order = ranked.next_sort_order
from ranked
where classrooms.id = ranked.id;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('classroom-images', 'classroom-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read classroom assets" on storage.objects;
drop policy if exists "authenticated upload classroom assets" on storage.objects;
drop policy if exists "authenticated update classroom assets" on storage.objects;
drop policy if exists "authenticated delete classroom assets" on storage.objects;

create policy "public read classroom assets"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('student-photos', 'group-icons', 'classroom-images'));

create policy "authenticated upload classroom assets"
on storage.objects for insert
to authenticated
with check (bucket_id in ('student-photos', 'group-icons', 'classroom-images'));

create policy "authenticated update classroom assets"
on storage.objects for update
to authenticated
using (bucket_id in ('student-photos', 'group-icons', 'classroom-images'))
with check (bucket_id in ('student-photos', 'group-icons', 'classroom-images'));

create policy "authenticated delete classroom assets"
on storage.objects for delete
to authenticated
using (bucket_id in ('student-photos', 'group-icons', 'classroom-images'));
