-- Fix missing RPC for /student-score and npm run supabase:check
-- Run this in Supabase Dashboard > SQL Editor, then run: npm run supabase:check

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

notify pgrst, 'reload schema';
