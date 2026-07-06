create extension if not exists pgcrypto;

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade_level text not null,
  academic_year text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  name text not null,
  color text not null default '#38bdf8',
  icon_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  student_number integer not null check (student_number > 0),
  full_name text not null,
  nickname text not null,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  photo_url text,
  profile_photo_mode text not null default 'random' check (profile_photo_mode in ('random', 'locked')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (classroom_id, student_number)
);

alter table public.students
  add column if not exists profile_photo_mode text not null default 'random';

alter table public.students drop constraint if exists students_profile_photo_mode_check;
alter table public.students add constraint students_profile_photo_mode_check check (profile_photo_mode in ('random', 'locked'));

create table if not exists public.student_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  photo_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order < 5),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  color text not null default '#7c3aed',
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.star_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  activity_name text not null,
  reason text not null,
  stars numeric(8, 2) not null check (stars <> 0),
  event_type text not null check (event_type in ('student', 'group')),
  created_at timestamptz not null default now(),
  constraint star_events_target_check check (
    (event_type = 'student' and student_id is not null and group_id is null)
    or
    (event_type = 'group' and group_id is not null and student_id is null)
  )
);

alter table public.star_events drop constraint if exists star_events_stars_check;
alter table public.star_events drop constraint if exists star_events_stars_nonzero_check;
alter table public.star_events add constraint star_events_stars_nonzero_check check (stars <> 0);

create table if not exists public.random_logs (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  mode text not null check (mode in ('individual', 'group', 'group-representative', 'battle', 'battle-student', 'helper', 'boss')),
  created_at timestamptz not null default now()
);

alter table public.random_logs drop constraint if exists random_logs_mode_check;
alter table public.random_logs add constraint random_logs_mode_check check (mode in ('individual', 'group', 'group-representative', 'battle', 'battle-student', 'helper', 'boss'));

create index if not exists idx_students_classroom on public.students(classroom_id);
create index if not exists idx_students_group on public.students(group_id);
create index if not exists idx_students_code on public.students(student_code);
create index if not exists idx_student_photos_student on public.student_photos(student_id, sort_order);
create unique index if not exists idx_student_photos_primary_unique on public.student_photos(student_id) where is_primary;
create index if not exists idx_groups_classroom on public.groups(classroom_id);
create index if not exists idx_subjects_classroom on public.subjects(classroom_id);
create index if not exists idx_star_events_student on public.star_events(student_id);
create index if not exists idx_star_events_group on public.star_events(group_id);
create index if not exists idx_star_events_classroom_created on public.star_events(classroom_id, created_at desc);
create index if not exists idx_random_logs_classroom_created on public.random_logs(classroom_id, created_at desc);

alter table public.classrooms enable row level security;
alter table public.students enable row level security;
alter table public.student_photos enable row level security;
alter table public.groups enable row level security;
alter table public.subjects enable row level security;
alter table public.star_events enable row level security;
alter table public.random_logs enable row level security;

drop policy if exists "authenticated read classrooms" on public.classrooms;
drop policy if exists "authenticated write classrooms" on public.classrooms;
drop policy if exists "authenticated update classrooms" on public.classrooms;
drop policy if exists "authenticated delete classrooms" on public.classrooms;
create policy "authenticated read classrooms" on public.classrooms for select to authenticated using (true);
create policy "authenticated write classrooms" on public.classrooms for insert to authenticated with check (true);
create policy "authenticated update classrooms" on public.classrooms for update to authenticated using (true) with check (true);
create policy "authenticated delete classrooms" on public.classrooms for delete to authenticated using (true);

drop policy if exists "authenticated read students" on public.students;
drop policy if exists "authenticated write students" on public.students;
drop policy if exists "authenticated update students" on public.students;
drop policy if exists "authenticated delete students" on public.students;
create policy "authenticated read students" on public.students for select to authenticated using (true);
create policy "authenticated write students" on public.students for insert to authenticated with check (true);
create policy "authenticated update students" on public.students for update to authenticated using (true) with check (true);
create policy "authenticated delete students" on public.students for delete to authenticated using (true);

drop policy if exists "authenticated read student photos" on public.student_photos;
drop policy if exists "authenticated write student photos" on public.student_photos;
drop policy if exists "authenticated update student photos" on public.student_photos;
drop policy if exists "authenticated delete student photos" on public.student_photos;
create policy "authenticated read student photos" on public.student_photos for select to authenticated using (true);
create policy "authenticated write student photos" on public.student_photos for insert to authenticated with check (true);
create policy "authenticated update student photos" on public.student_photos for update to authenticated using (true) with check (true);
create policy "authenticated delete student photos" on public.student_photos for delete to authenticated using (true);

drop policy if exists "authenticated read groups" on public.groups;
drop policy if exists "authenticated write groups" on public.groups;
drop policy if exists "authenticated update groups" on public.groups;
drop policy if exists "authenticated delete groups" on public.groups;
create policy "authenticated read groups" on public.groups for select to authenticated using (true);
create policy "authenticated write groups" on public.groups for insert to authenticated with check (true);
create policy "authenticated update groups" on public.groups for update to authenticated using (true) with check (true);
create policy "authenticated delete groups" on public.groups for delete to authenticated using (true);

drop policy if exists "authenticated read subjects" on public.subjects;
drop policy if exists "authenticated write subjects" on public.subjects;
drop policy if exists "authenticated update subjects" on public.subjects;
drop policy if exists "authenticated delete subjects" on public.subjects;
create policy "authenticated read subjects" on public.subjects for select to authenticated using (true);
create policy "authenticated write subjects" on public.subjects for insert to authenticated with check (true);
create policy "authenticated update subjects" on public.subjects for update to authenticated using (true) with check (true);
create policy "authenticated delete subjects" on public.subjects for delete to authenticated using (true);

drop policy if exists "authenticated read star events" on public.star_events;
drop policy if exists "authenticated write star events" on public.star_events;
drop policy if exists "authenticated delete star events" on public.star_events;
create policy "authenticated read star events" on public.star_events for select to authenticated using (true);
create policy "authenticated write star events" on public.star_events for insert to authenticated with check (true);

drop policy if exists "authenticated read random logs" on public.random_logs;
drop policy if exists "authenticated write random logs" on public.random_logs;
create policy "authenticated read random logs" on public.random_logs for select to authenticated using (true);
create policy "authenticated write random logs" on public.random_logs for insert to authenticated with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.classrooms to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.student_photos to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert on public.star_events to authenticated;
grant select, insert on public.random_logs to authenticated;
revoke update, delete on public.star_events from authenticated;

create or replace function public.enforce_student_photo_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.student_photos
    where student_id = new.student_id
      and id <> new.id
  ) >= 5 then
    raise exception 'student photo limit exceeded';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_student_photo_limit() from public;

drop trigger if exists student_photo_limit_before_insert on public.student_photos;
create trigger student_photo_limit_before_insert
before insert or update of student_id on public.student_photos
for each row execute function public.enforce_student_photo_limit();

insert into public.student_photos (student_id, photo_url, sort_order, is_primary, created_at)
select s.id, s.photo_url, 0, true, s.created_at
from public.students s
where s.photo_url is not null
  and not exists (
    select 1
    from public.student_photos sp
    where sp.student_id = s.id
  );

create or replace function public.get_student_score_by_code(lookup_code text)
returns table (
  student_id uuid,
  full_name text,
  nickname text,
  photo_url text,
  classroom_name text,
  group_name text,
  total_stars numeric,
  today_stars numeric,
  subject_stars jsonb,
  recent_events jsonb
)
language sql
security definer
set search_path = public
as $$
  with target as (
    select
      s.id,
      s.full_name,
      s.nickname,
      s.photo_url,
      s.classroom_id,
      c.name as classroom_name,
      g.name as group_name
    from public.students s
    join public.classrooms c on c.id = s.classroom_id
    left join public.groups g on g.id = s.group_id
    where s.student_code = lookup_code
      and s.status = 'active'
    limit 1
  )
  select
    target.id as student_id,
    target.full_name,
    target.nickname,
    target.photo_url,
    target.classroom_name,
    target.group_name,
    coalesce((
      select sum(se.stars)
      from public.star_events se
      where se.student_id = target.id
    ), 0) as total_stars,
    coalesce((
      select sum(se.stars)
      from public.star_events se
      where se.student_id = target.id
        and se.created_at >= date_trunc('day', now())
        and se.created_at < date_trunc('day', now()) + interval '1 day'
    ), 0) as today_stars,
    coalesce((
      select jsonb_agg(jsonb_build_object('subject_name', subject_name, 'stars', stars) order by subject_name)
      from (
        select sub.name as subject_name, coalesce(sum(se.stars), 0) as stars
        from public.subjects sub
        left join public.star_events se
          on se.subject_id = sub.id
          and se.student_id = target.id
        where sub.classroom_id = target.classroom_id
        group by sub.id, sub.name
        having coalesce(sum(se.stars), 0) > 0
      ) subject_summary
    ), '[]'::jsonb) as subject_stars,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'activity_name', event_rows.activity_name,
          'reason', event_rows.reason,
          'stars', event_rows.stars,
          'created_at', event_rows.created_at
        )
        order by event_rows.created_at desc
      )
      from (
        select se.activity_name, se.reason, se.stars, se.created_at
        from public.star_events se
        where se.student_id = target.id
        order by se.created_at desc
        limit 10
      ) event_rows
    ), '[]'::jsonb) as recent_events
  from target;
$$;

revoke all on function public.get_student_score_by_code(text) from public;
grant execute on function public.get_student_score_by_code(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-photos', 'student-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('group-icons', 'group-icons', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
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
using (bucket_id in ('student-photos', 'group-icons'));

create policy "authenticated upload classroom assets"
on storage.objects for insert
to authenticated
with check (bucket_id in ('student-photos', 'group-icons'));

create policy "authenticated update classroom assets"
on storage.objects for update
to authenticated
using (bucket_id in ('student-photos', 'group-icons'))
with check (bucket_id in ('student-photos', 'group-icons'));

create policy "authenticated delete classroom assets"
on storage.objects for delete
to authenticated
using (bucket_id in ('student-photos', 'group-icons'));
