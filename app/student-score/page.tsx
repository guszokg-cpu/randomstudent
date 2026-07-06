"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Star } from "lucide-react";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/fields";
import { PageCard } from "@/components/ui/page-card";
import { sumStudentStars } from "@/lib/calculations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StudentScoreLookup } from "@/lib/types";
import { formatStars, isToday } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

export default function StudentScorePage() {
  const { data, isDemoMode } = useData();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<StudentScoreLookup | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    const lookupCode = code.trim();
    if (!lookupCode) return;
    setLoading(true);
    try {
      if (isDemoMode) {
        const student = data.students.find((item) => item.student_code === lookupCode);
        if (!student) throw new Error("ไม่พบเลขประจำตัวนี้");
        const classroom = data.classrooms.find((item) => item.id === student.classroom_id);
        const group = data.groups.find((item) => item.id === student.group_id);
        const events = data.starEvents.filter((eventItem) => eventItem.student_id === student.id);
        const subjectStars = data.subjects
          .filter((subject) => subject.classroom_id === student.classroom_id)
          .map((subject) => ({ subject_name: subject.name, stars: sumStudentStars(data.starEvents, student.id, subject.id) }))
          .filter((item) => item.stars > 0);
        setResult({
          student_id: student.id,
          full_name: student.full_name,
          nickname: student.nickname,
          photo_url: student.photo_url,
          classroom_name: classroom?.name ?? "-",
          group_name: group?.name ?? null,
          total_stars: sumStudentStars(data.starEvents, student.id),
          today_stars: events.filter((eventItem) => isToday(eventItem.created_at)).reduce((sum, eventItem) => sum + eventItem.stars, 0),
          subject_stars: subjectStars,
          recent_events: events.slice(0, 10).map((eventItem) => ({
            activity_name: eventItem.activity_name,
            reason: eventItem.reason,
            stars: eventItem.stars,
            created_at: eventItem.created_at
          }))
        });
      } else {
        const supabase = getSupabaseBrowserClient();
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_student_score_by_code", { lookup_code: lookupCode });
        if (rpcError) throw rpcError;
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (!row) throw new Error("ไม่พบเลขประจำตัวนี้");
        setResult({
          ...row,
          total_stars: Number(row.total_stars ?? 0),
          today_stars: Number(row.today_stars ?? 0),
          subject_stars: Array.isArray(row.subject_stars) ? row.subject_stars : [],
          recent_events: Array.isArray(row.recent_events) ? row.recent_events : []
        } as StudentScoreLookup);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-bg min-h-screen p-4 text-white sm:p-6">
      <div className="relative z-10 mx-auto max-w-4xl">
        <Link href="/login">
          <Button variant="light">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Button>
        </Link>

        <section className="mt-8 rounded-[2rem] bg-white p-6 text-violet-950 shadow-2xl sm:p-8">
          <div className="text-center">
            <img src="/mascot-star.svg" alt="" className="mx-auto h-24 w-24" />
            <h1 className="text-4xl font-black sm:text-5xl">ตรวจคะแนนดาวของฉัน</h1>
            <p className="mt-2 font-semibold text-slate-500">กรอกเลขประจำตัวนักเรียนเพื่อดูคะแนนของตนเองเท่านั้น</p>
          </div>

          <form className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row" onSubmit={lookup}>
            <TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder="เช่น S2569-401-001" />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4" />
              ดูคะแนน
            </Button>
          </form>
          {error ? <p className="mx-auto mt-4 max-w-xl rounded-2xl bg-rose-50 p-3 text-center font-bold text-rose-600">{error}</p> : null}
        </section>

        {result ? (
          <section className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
            <PageCard className="text-center text-violet-950">
              <StudentAvatar name={result.full_name} photoUrl={result.photo_url} size="xl" className="mx-auto" />
              <h2 className="mt-4 text-4xl font-black">{result.nickname}</h2>
              <p className="font-bold text-slate-500">{result.full_name}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-violet-50 p-3">
                  <p className="text-sm font-bold text-slate-500">ห้อง</p>
                  <p className="font-black">{result.classroom_name}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-3">
                  <p className="text-sm font-bold text-slate-500">กลุ่ม</p>
                  <p className="font-black">{result.group_name ?? "-"}</p>
                </div>
              </div>
            </PageCard>

            <div className="space-y-5">
              <section className="grid gap-4 sm:grid-cols-2">
                <PageCard className="text-violet-950">
                  <p className="font-bold text-slate-500">ดาวสะสมทั้งหมด</p>
                  <p className="text-5xl font-black text-amber-500">{formatStars(result.total_stars)} ⭐</p>
                </PageCard>
                <PageCard className="text-violet-950">
                  <p className="font-bold text-slate-500">ดาววันนี้</p>
                  <p className="text-5xl font-black text-emerald-500">{formatStars(result.today_stars)} ⭐</p>
                </PageCard>
              </section>

              <PageCard className="text-violet-950">
                <h3 className="mb-3 text-xl font-black">ดาวรายวิชา</h3>
                <div className="space-y-2">
                  {result.subject_stars.length === 0 ? <p className="font-semibold text-slate-500">ยังไม่มีดาวแยกรายวิชา</p> : null}
                  {result.subject_stars.map((item) => (
                    <div key={item.subject_name} className="flex items-center justify-between rounded-2xl bg-white p-3">
                      <span className="font-bold">{item.subject_name}</span>
                      <span className="font-black text-amber-500">{formatStars(item.stars)} ⭐</span>
                    </div>
                  ))}
                </div>
              </PageCard>

              <PageCard className="text-violet-950">
                <h3 className="mb-3 text-xl font-black">ประวัติล่าสุด 10 รายการ</h3>
                <div className="space-y-2">
                  {result.recent_events.length === 0 ? <p className="font-semibold text-slate-500">ยังไม่มีประวัติการได้ดาว</p> : null}
                  {result.recent_events.map((eventItem, index) => (
                    <div key={`${eventItem.created_at}-${index}`} className="grid gap-2 rounded-2xl bg-white p-3 sm:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-black">{eventItem.activity_name}</p>
                        <p className="text-sm font-semibold text-slate-500">{eventItem.reason}</p>
                      </div>
                      <p className="flex items-center gap-1 font-black text-amber-500">
                        {formatStars(eventItem.stars)}
                        <Star className="h-4 w-4 fill-current" />
                      </p>
                    </div>
                  ))}
                </div>
              </PageCard>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
