"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  Crown,
  DoorOpen,
  PlayCircle,
  RefreshCcw,
  Rocket,
  Sparkles,
  Star,
  BadgePlus,
  Upload,
  Users,
  UsersRound
} from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { PageCard } from "@/components/ui/page-card";
import { classroomName, primaryStudentPhoto, topStudents } from "@/lib/calculations";
import type { DataBundle } from "@/lib/types";
import { formatStars, isToday } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

const quickActions = [
  { href: "/play/direct-award", label: "แจกดาวทันที", detail: "ตอบในห้องแล้วให้ดาวทันที", icon: BadgePlus, tone: "pink" },
  { href: "/play/individual", label: "สุ่มนักตอบ", detail: "สุ่มชื่อนักเรียนแบบลุ้นสนุก", icon: PlayCircle, tone: "violet" },
  { href: "/students", label: "นำเข้ารายชื่อ", detail: "Excel และแก้ไขข้อมูลนักเรียน", icon: Upload, tone: "sky" },
  { href: "/reports", label: "รายงานดาว", detail: "ดูดาวรายกิจกรรมและรายคน", icon: BarChart3, tone: "emerald" }
] as const;

const actionTones = {
  violet: "from-violet-500 to-fuchsia-500 text-white shadow-violet-700/25",
  sky: "from-sky-400 to-cyan-400 text-white shadow-sky-600/20",
  emerald: "from-emerald-400 to-teal-400 text-white shadow-emerald-600/20",
  amber: "from-amber-300 to-orange-400 text-slate-950 shadow-amber-500/20",
  pink: "from-pink-400 to-rose-500 text-white shadow-pink-600/20"
};

export default function DashboardPage() {
  const { data, loading, error, isDemoMode, resetDemoData } = useData();
  const activeClassrooms = data.classrooms.filter((classroom) => classroom.status === "active");
  const activeStudents = data.students.filter((student) => student.status === "active");
  const todaysEvents = data.starEvents.filter((event) => isToday(event.created_at));
  const topToday = topStudents({ ...data, starEvents: todaysEvents }, undefined, null, 8).filter((row) => row.stars > 0).slice(0, 5);
  const totalStars = data.starEvents.reduce((sum, event) => sum + Number(event.stars), 0);
  const latestEvents = [...data.starEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  const classroomsWithSummary = activeClassrooms.slice(0, 5).map((classroom) => {
    const studentCount = activeStudents.filter((student) => student.classroom_id === classroom.id).length;
    const classroomEvents = data.starEvents.filter((event) => event.classroom_id === classroom.id);
    const todayCount = classroomEvents.filter((event) => isToday(event.created_at)).length;
    const stars = classroomEvents.reduce((sum, event) => sum + Number(event.stars), 0);
    return { classroom, studentCount, todayCount, stars };
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black text-violet-700">ฐานบัญชาการครู</p>
          <h1 className="text-3xl font-black text-violet-950 sm:text-4xl">ศูนย์ควบคุมสุ่มสนุก</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-600">พร้อมสุ่มชื่อ ให้ดาว และติดตามความก้าวหน้าในห้องเรียน</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/play">
            <Button className="min-h-12 px-5 text-base">
              <Rocket className="h-5 w-5" />
              เริ่มสุ่มเลย
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="light">
              <BarChart3 className="h-4 w-4" />
              รายงาน
            </Button>
          </Link>
          {isDemoMode ? (
            <Button variant="ghost" onClick={resetDemoData}>
              <RefreshCcw className="h-4 w-4" />
              รีเซ็ตข้อมูลตัวอย่าง
            </Button>
          ) : null}
        </div>
      </header>

      {error ? <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 font-bold text-rose-700">{error}</div> : null}
      {loading ? <div className="soft-card rounded-xl p-5 font-bold text-slate-700">กำลังโหลดข้อมูล...</div> : null}

      <section className="admin-hero rounded-3xl p-5 text-white sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
          <div className="flex min-h-[260px] flex-col justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-violet-950 shadow-lg shadow-amber-300/20">
                <Star className="h-5 w-5 fill-current" />
                ภารกิจวันนี้
              </div>
              <h2 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl">พร้อมสุ่มชื่อ ให้ดาว และสร้างแรงบันดาลใจให้ทุกคนเปล่งประกาย!</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="รายการให้ดาววันนี้" value={todaysEvents.length} icon={<ClipboardList className="h-5 w-5" />} />
              <HeroMetric label="ดาววันนี้" value={`${formatStars(todaysEvents.reduce((sum, event) => sum + Number(event.stars), 0))}`} icon={<Star className="h-5 w-5 fill-current" />} />
              <HeroMetric label="ดาวสะสมทั้งหมด" value={`${formatStars(totalStars)}`} icon={<Crown className="h-5 w-5" />} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/12 p-5 shadow-2xl shadow-violet-950/20 backdrop-blur">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-amber-200">Mission Board</p>
                <h3 className="text-2xl font-black">ภารกิจวันนี้</h3>
                <p className="mt-1 text-sm font-semibold text-violet-50/75">เลือกงานหลักที่ใช้บ่อยในห้องเรียนได้ทันที</p>
              </div>
              <img src="/mascot-star.svg" alt="" className="h-16 w-16 twinkle-slow" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} className="game-card-hover group rounded-2xl border border-white/10 bg-white p-4 text-violet-950 shadow-xl shadow-violet-950/10">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br shadow-lg ${actionTones[action.tone]}`}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <ArrowRight className="h-5 w-5 text-violet-300 transition group-hover:translate-x-1 group-hover:text-violet-700" />
                    </div>
                    <p className="text-lg font-black">{action.label}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">{action.detail}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ห้องพร้อมเล่น" value={activeClassrooms.length} icon={<DoorOpen className="h-5 w-5" />} tone="sky" note="ห้องที่เปิดใช้งาน" />
        <StatCard label="นักเรียนในเกม" value={activeStudents.length} icon={<Users className="h-5 w-5" />} tone="emerald" note="พร้อมร่วมกิจกรรม" />
        <StatCard label="ทีมภารกิจ" value={data.groups.length} icon={<UsersRound className="h-5 w-5" />} tone="amber" note="รวมทุกห้องเรียน" />
        <StatCard label="รายการดาววันนี้" value={todaysEvents.length} icon={<Star className="h-5 w-5" />} tone="rose" note="รายคนและรายกลุ่ม" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <PageCard className="overflow-hidden">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-violet-950">ห้องเรียนพร้อมลุย</h2>
              <p className="text-sm font-semibold text-slate-500">จำนวนเด็ก ดาวสะสม และกิจกรรมของแต่ละห้อง</p>
            </div>
            <Link href="/classrooms">
              <Button variant="light">
                <DoorOpen className="h-4 w-4" />
                จัดการห้องเรียน
              </Button>
            </Link>
          </div>

          {classroomsWithSummary.length === 0 ? (
            <EmptyState title="ยังไม่มีห้องเรียน" detail="เริ่มจากสร้างห้องเรียนก่อน แล้วค่อยเพิ่มนักเรียนและกลุ่ม" />
          ) : (
            <div className="space-y-3">
              {classroomsWithSummary.map(({ classroom, studentCount, todayCount, stars }) => (
                <div key={classroom.id} className="game-card-hover grid gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-white to-violet-50/70 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-700/20">
                      <Rocket className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-violet-950">{classroom.name}</p>
                      <p className="text-sm font-semibold text-slate-500">
                        {classroom.grade_level} · ปีการศึกษา {classroom.academic_year}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">นักเรียน {studentCount} คน</span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-100">ดาวสะสม {formatStars(stars)}</span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">วันนี้ {todayCount} รายการ</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link href={`/students?classroom=${classroom.id}`}>
                      <Button variant="light">นักเรียน</Button>
                    </Link>
                    <Link href={`/groups?classroom=${classroom.id}`}>
                      <Button variant="light">กลุ่ม</Button>
                    </Link>
                    <Link href={`/play?classroom=${classroom.id}`}>
                      <Button>
                        <PlayCircle className="h-4 w-4" />
                        เริ่มภารกิจ
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        <PageCard className="dashboard-top-card text-white">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">ดาวยอดเยี่ยมวันนี้</h2>
              <p className="text-sm font-semibold text-violet-100/75">Top 5 นักเรียนที่ได้ดาวมากที่สุด</p>
            </div>
            <Star className="h-11 w-11 fill-amber-300 text-amber-300 twinkle-slow" />
          </div>

          {topToday.length === 0 ? (
            <EmptyState title="วันนี้ยังไม่มีการให้ดาว" detail="เมื่อให้ดาวรายคน อันดับวันนี้จะแสดงที่นี่" />
          ) : (
            <div className="space-y-3">
              {topToday.map(({ student, stars }, index) => (
                <div key={student.id} className="game-card-hover flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300 text-sm font-black text-violet-950 shadow-lg shadow-amber-300/20">{index + 1}</div>
                    <StudentAvatar name={student.full_name} photoUrl={primaryStudentPhoto(data.studentPhotos, student)} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-white">{student.full_name}</p>
                      <p className="truncate text-xs font-semibold text-violet-100/70">
                        ชื่อเล่น {student.nickname} · {classroomName(data.classrooms, student.classroom_id)}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-xl font-black text-amber-200">{formatStars(stars)} ⭐</p>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <PageCard>
          <h2 className="mb-4 text-xl font-black text-slate-950">ทางลัดจัดการข้อมูล</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Shortcut href="/students" icon={<Users className="h-5 w-5" />} label="รายชื่อนักเรียน" />
            <Shortcut href="/subjects" icon={<BookOpen className="h-5 w-5" />} label="วิชาของฉัน" />
            <Shortcut href="/groups" icon={<UsersRound className="h-5 w-5" />} label="จัดกลุ่ม" />
            <Shortcut href="/leaderboard" icon={<Star className="h-5 w-5" />} label="ดาวสะสม" />
          </div>
        </PageCard>

        <PageCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">กิจกรรมล่าสุด</h2>
              <p className="text-sm font-semibold text-slate-500">รายการให้ดาวล่าสุดจากทุกห้อง</p>
            </div>
            <Link href="/reports">
              <Button variant="light">
                <BarChart3 className="h-4 w-4" />
                รายงานเต็ม
              </Button>
            </Link>
          </div>

          {latestEvents.length === 0 ? (
            <EmptyState title="ยังไม่มีประวัติการให้ดาว" detail="เมื่อเริ่มให้ดาว รายการล่าสุดจะแสดงที่นี่" />
          ) : (
            <div className="space-y-2">
              {latestEvents.map((event) => {
                const recipient = eventRecipient(data, event.student_id, event.group_id);
                return (
                  <div key={event.id} className="grid gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-black text-slate-950">{recipient.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{recipient.detail}</p>
                      <p className="text-sm font-semibold text-slate-500">
                        {event.activity_name} · {classroomName(data.classrooms, event.classroom_id)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-black text-amber-500">{formatStars(event.stars)} ⭐</p>
                      <p className="text-xs font-bold text-slate-400">{formatDateTime(event.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15 backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-white/70">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-amber-200">{icon}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Shortcut({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 font-black text-slate-950 transition hover:border-violet-100 hover:bg-violet-50">
      <span className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-violet-700 ring-1 ring-slate-200">{icon}</span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-slate-300" />
    </Link>
  );
}

function eventRecipient(data: DataBundle, studentId: string | null, groupId: string | null) {
  if (studentId) {
    const student = data.students.find((item) => item.id === studentId);
    if (student) {
      return {
        name: student.full_name,
        detail: `ชื่อเล่น ${student.nickname} · เลขที่ ${student.student_number}`
      };
    }
  }
  if (groupId) {
    const group = data.groups.find((item) => item.id === groupId);
    if (group) {
      return {
        name: group.name,
        detail: "ให้ดาวทั้งกลุ่ม"
      };
    }
  }
  return {
    name: "รายการดาว",
    detail: "ไม่พบผู้รับดาว"
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
