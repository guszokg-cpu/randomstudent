insert into public.classrooms (id, name, grade_level, academic_year, status)
values
  ('8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', 'ป.4/1', 'ป.4', '2569', 'active')
on conflict (id) do nothing;

insert into public.groups (id, classroom_id, name, color)
values
  ('9a11a8ad-6a1b-4d9f-94ab-1db4f35cc101', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', 'ดาวเหนือ', '#38bdf8'),
  ('9a11a8ad-6a1b-4d9f-94ab-1db4f35cc102', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', 'สายฟ้า', '#f59e0b'),
  ('9a11a8ad-6a1b-4d9f-94ab-1db4f35cc103', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', 'จรวดน้อย', '#ef4444'),
  ('9a11a8ad-6a1b-4d9f-94ab-1db4f35cc104', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', 'นักคิดพิชิตโจทย์', '#ec4899')
on conflict (id) do nothing;

insert into public.subjects (id, classroom_id, name, color, description)
values
  ('2a11a8ad-6a1b-4d9f-94ab-1db4f35cc301', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', 'คณิตศาสตร์ ป.4', '#7c3aed', 'กิจกรรมคิดเลขและแก้โจทย์ปัญหา')
on conflict (id) do nothing;

insert into public.students (id, student_code, student_number, full_name, nickname, classroom_id, group_id, status)
values
  ('1a11a8ad-6a1b-4d9f-94ab-1db4f35cc201', 'S2569-401-001', 1, 'เด็กชายก้องภพ ศรีสุข', 'ก้อง', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', '9a11a8ad-6a1b-4d9f-94ab-1db4f35cc101', 'active'),
  ('1a11a8ad-6a1b-4d9f-94ab-1db4f35cc202', 'S2569-401-002', 2, 'เด็กหญิงแพรวพราว ใจดี', 'แพรว', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', '9a11a8ad-6a1b-4d9f-94ab-1db4f35cc101', 'active'),
  ('1a11a8ad-6a1b-4d9f-94ab-1db4f35cc203', 'S2569-401-003', 3, 'เด็กชายบอลลภ เก่งกล้า', 'บอล', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', '9a11a8ad-6a1b-4d9f-94ab-1db4f35cc102', 'active'),
  ('1a11a8ad-6a1b-4d9f-94ab-1db4f35cc204', 'S2569-401-004', 4, 'เด็กหญิงฟ้าใส น่ารัก', 'ฟ้าใส', '8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001', '9a11a8ad-6a1b-4d9f-94ab-1db4f35cc102', 'active')
on conflict (id) do nothing;
