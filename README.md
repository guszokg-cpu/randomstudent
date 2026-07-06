# สุ่มสนุก ดาวนักคิด

เว็บแอป Next.js สำหรับครูใช้สุ่มชื่อนักเรียน สุ่มกลุ่ม ให้ดาวสะสม แสดงกระดานดาวหน้าห้อง และให้นักเรียนตรวจคะแนนของตัวเองด้วยเลขประจำตัว

## สิ่งที่มีใน MVP

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Database + Storage schema ใน `supabase/schema.sql`
- Demo mode ด้วยข้อมูลสมมติเมื่อยังไม่ใส่ค่า Supabase
- CRUD ห้องเรียน นักเรียน กลุ่ม รายวิชา
- อัปโหลดรูปนักเรียนได้สูงสุด 5 ภาพต่อคน พร้อมสุ่มรูปที่แสดงในหน้าเล่น และอัปโหลดไอคอนกลุ่ม
- จัดสมาชิกกลุ่ม ย้ายกลุ่ม ถอดออกจากกลุ่ม
- โหมดสุ่มรายคน รายกลุ่ม ตัวแทนทุกกลุ่ม คู่แข่ง ช่วยเพื่อน และ Boss Challenge
- ให้ดาวรายคนและรายกลุ่ม พร้อมบันทึกประวัติ
- กระดานดาวรายคน/รายกลุ่ม
- หน้า `/student-score` แบบ read-only ค้นด้วย `student_code`
- Login ด้วย Supabase Auth พร้อมเปลี่ยนรหัสผ่านและส่งลิงก์รีเซ็ตรหัสผ่าน

## เริ่มใช้งานในเครื่อง

```bash
npm install
npm run dev
```

เปิด `http://127.0.0.1:3001`

ถ้ายังไม่ตั้งค่า Supabase ระบบจะเข้า demo mode อัตโนมัติ

## ตั้งค่า Supabase

1. สร้าง Supabase project
2. เปิด SQL Editor แล้วรัน `supabase/schema.sql` ถ้าอัปเดตจากเวอร์ชันเดิมให้รันซ้ำเพื่อเพิ่มตาราง `student_photos`
3. ถ้าต้องการข้อมูลทดลอง ให้รัน `supabase/seed.sql`
4. สร้างครูผู้ใช้งานใน Supabase Auth
5. คัดลอก `.env.example` เป็น `.env.local`
6. เติมค่าจาก Supabase Dashboard > Project Settings > API:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_TEACHER_LOGIN_EMAIL=
```

ถ้า Supabase project แสดง key ชื่อ publishable key แทน anon key สามารถใส่เป็น `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ได้ โค้ดรองรับทั้งสองชื่อ

`NEXT_PUBLIC_TEACHER_LOGIN_EMAIL` คืออีเมลบัญชีครูหลักที่สร้างไว้ใน Supabase Auth หน้า Login จะไม่แสดงช่องอีเมล แต่จะใช้อีเมลนี้เบื้องหลังเพื่อเช็กรหัสผ่าน

`SUPABASE_SERVICE_ROLE_KEY` ยังไม่จำเป็นกับแอปเวอร์ชันนี้ ถ้าจะใช้ภายหลังต้องเก็บเป็น server-only variable เท่านั้น และห้ามใส่ prefix `NEXT_PUBLIC`

หลังกรอก `.env.local` แล้วตรวจการเชื่อมต่อ:

```bash
npm run supabase:check
```

ถ้าผ่านแล้วให้ restart dev server:

```bash
npm run dev
```

เปิดเว็บที่ `http://127.0.0.1:3001` หน้าแรกจะเข้า `/play` ทันที ถ้ายังไม่เข้ารหัสครูจะเป็นโหมดทดลองและไม่บันทึกคะแนนลง Supabase เมื่อเข้ารหัสสำเร็จจึงใช้ข้อมูลจริงและบันทึกดาวจริง

## Login และการลืมรหัสผ่าน

- ระบบใช้ Supabase Auth จัดการรหัสผ่าน ไม่บันทึกรหัสผ่านแบบ plain text หรือแบบถอดกลับได้ในตารางของแอป
- หน้า Login ให้ครูกรอกเฉพาะรหัสผ่าน โดยใช้อีเมลจาก `NEXT_PUBLIC_TEACHER_LOGIN_EMAIL` เป็นบัญชี Supabase Auth เบื้องหลัง
- รหัสผ่านตั้งต้นไม่มีในโค้ด ต้องตั้งเองตอนสร้างผู้ใช้ใน Supabase Dashboard > Authentication > Users
- อีเมลที่ใช้รีเซ็ตรหัสผ่านคืออีเมลของ Auth user ครูหลัก ไม่ใช่อีเมลเจ้าของโปรเจกต์ Supabase และไม่ใช่ค่า API key
- ครูที่ล็อกอินแล้วสามารถเปลี่ยนรหัสผ่านได้ที่เมนู `ตั้งค่า`
- หน้า login มีปุ่มส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลครูหลัก
- ใน Supabase Dashboard > Authentication > URL Configuration ให้ตั้งค่า:
  - Site URL เป็น URL จริงบน Vercel เช่น `https://your-app.vercel.app`
  - Redirect URLs เพิ่ม `https://your-app.vercel.app/settings?mode=password-recovery`
  - ตอนทดสอบในเครื่อง เพิ่ม `http://127.0.0.1:3001/settings?mode=password-recovery`

## Deploy บน Vercel

1. Push โปรเจกต์ขึ้น GitHub
2. Import project ใน Vercel
3. ตั้งค่า Environment Variables ให้ตรงกับ `.env.example`
4. ตั้ง Supabase Auth URL Configuration ให้ตรงกับ domain ของ Vercel
5. Deploy
6. ทดสอบ flow สำคัญหลัง deploy:
   - login ด้วยบัญชีครู
   - เพิ่ม/แก้ไขนักเรียนและรูปโปรไฟล์
   - สุ่มชื่อ/สุ่มกลุ่ม/ให้ดาว/ลดดาว
   - รายงานดาวรายคนและรายกิจกรรม
   - ส่งลิงก์ลืมรหัสผ่านและตั้งรหัสผ่านใหม่

## หมายเหตุความปลอดภัย

- ตารางหลักเปิด RLS แล้ว
- งานเพิ่ม/แก้ไข/ลบเปิดเฉพาะ role `authenticated`
- `/student-score` ใช้ RPC `get_student_score_by_code` เพื่อคืนข้อมูลเฉพาะนักเรียนที่ค้นด้วยเลขประจำตัว ไม่เปิด select รายชื่อนักเรียนทั้งตารางให้ `anon`
- MVP นี้พร้อมใช้กับครู/โรงเรียนเดียวก่อน แต่ยังไม่พร้อมเปิดเป็นระบบหลายโรงเรียนหรือหลายครูที่ต้องแยกข้อมูลกัน เพราะ RLS policy ปัจจุบันให้ผู้ใช้ที่ authenticated อ่าน/แก้ไขข้อมูลทุกห้องได้
- ถ้าจะเปิดหลายบัญชีจริง ควรเพิ่มตาราง owner/profile เช่น `teacher_id` หรือ `school_id` แล้วปรับ RLS ให้ผูกข้อมูลกับ `auth.uid()`

## สถานะความพร้อมขึ้นจริง

- พร้อม: Next.js build, Supabase Auth, schema, storage buckets, demo mode, และ environment variables พื้นฐาน
- ต้องตั้งค่าก่อนใช้งานจริง: Supabase project, SQL schema, Auth user, Auth redirect URL, Vercel environment variables
- ควรทำก่อนขาย/เปิดหลายโรงเรียน: แยก tenant/สิทธิ์ครู, backup/restore, logging เพิ่มเติม, และหน้าจัดการบัญชีผู้ใช้
