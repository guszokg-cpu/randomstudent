-- Fix permission for Settings > ล้างคะแนนดาว
-- Run this in Supabase Dashboard > SQL Editor once, then try the reset button again.

drop policy if exists "authenticated delete star events" on public.star_events;

create policy "authenticated delete star events"
on public.star_events
for delete
to authenticated
using (true);

grant delete on public.star_events to authenticated;
revoke update on public.star_events from authenticated;

notify pgrst, 'reload schema';
