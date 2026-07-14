"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, HeartHandshake, RefreshCcw, Star } from "lucide-react";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { RepeatModeControl } from "@/components/randomizer/repeat-mode-control";
import { RollTrail } from "@/components/randomizer/roll-trail";
import { TeachingSessionBadge } from "@/components/randomizer/teaching-session-badge";
import { useDramaticDraw } from "@/components/randomizer/use-dramatic-draw";
import { Button } from "@/components/ui/button";
import { classroomStudents, primaryStudentPhoto, randomStudentPhoto } from "@/lib/calculations";
import { excludedWhenUnique, isUniqueMode, nextPickedIds, type RepeatMode } from "@/lib/repeat-mode";
import { playPointSound } from "@/lib/sound-effects";
import { resolvePlaySession } from "@/lib/teaching-session";
import type { Student } from "@/lib/types";
import { formatStars, pickOne } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

export default function HelperPage() {
  const { data, addStudentStarEvents, logRandom } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("ภารกิจช่วยเพื่อน");
  const [mainStudent, setMainStudent] = useState<Student | null>(null);
  const [helper, setHelper] = useState<Student | null>(null);
  const [mainPhotoUrl, setMainPhotoUrl] = useState<string | null>(null);
  const [helperPhotoUrl, setHelperPhotoUrl] = useState<string | null>(null);
  const [pickedMainIds, setPickedMainIds] = useState<string[]>([]);
  const [pickedHelperIds, setPickedHelperIds] = useState<string[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");
  const [savingAward, setSavingAward] = useState(false);
  const [toast, setToast] = useState("");
  const mainRoll = useDramaticDraw<Student>();
  const helperRoll = useDramaticDraw<Student>();

  useEffect(() => {
    const session = resolvePlaySession({ classrooms: data.classrooms, subjects: data.subjects, defaultActivity: "ภารกิจช่วยเพื่อน" });
    setClassroomId(session.classroomId);
    setSubjectId(session.subjectId);
    setActivity(session.activity);
    setRepeatMode(session.repeatMode);
  }, [data.classrooms, data.subjects]);

  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const classroom = data.classrooms.find((item) => item.id === classroomId) ?? null;
  const subject = data.subjects.find((item) => item.id === subjectId) ?? null;
  const displayMain = mainRoll.preview ?? mainStudent;
  const displayHelper = helperRoll.preview ?? helper;
  const displayMainPhotoUrl = displayMain
    ? mainRoll.preview
      ? primaryStudentPhoto(data.studentPhotos, displayMain)
      : mainPhotoUrl ?? primaryStudentPhoto(data.studentPhotos, displayMain)
    : null;
  const displayHelperPhotoUrl = displayHelper
    ? helperRoll.preview
      ? primaryStudentPhoto(data.studentPhotos, displayHelper)
      : helperPhotoUrl ?? primaryStudentPhoto(data.studentPhotos, displayHelper)
    : null;
  const avoidRepeat = isUniqueMode(repeatMode);

  function drawMain() {
    const excluded = excludedWhenUnique(pickedMainIds, students.length, 1, avoidRepeat);
    const winner = pickOne(students, excluded, (student) => student.id);
    if (!winner) return;
    setHelper(null);
    setHelperPhotoUrl(null);
    setMainPhotoUrl(null);
    helperRoll.reset();
    mainRoll.start({
      pool: students,
      winner,
      getId: (student) => student.id,
      durationMs: 5000,
      intervalMs: 65,
      onFinish: () => {
        setMainStudent(winner);
        setMainPhotoUrl(randomStudentPhoto(data.studentPhotos, winner));
        setPickedMainIds((current) => nextPickedIds(current, [winner.id], students.length, avoidRepeat));
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: winner.id, mode: "helper" });
      }
    });
  }

  function drawHelper() {
    const pool = students.filter((student) => student.id !== mainStudent?.id);
    const availablePicked = pickedHelperIds.filter((id) => pool.some((student) => student.id === id));
    const excluded = excludedWhenUnique(availablePicked, pool.length, 1, avoidRepeat);
    const winner = pickOne(pool, excluded, (student) => student.id);
    if (!winner) return;
    setHelperPhotoUrl(null);
    helperRoll.start({
      pool,
      winner,
      getId: (student) => student.id,
      durationMs: 5000,
      intervalMs: 60,
      onFinish: () => {
        setHelper(winner);
        setHelperPhotoUrl(randomStudentPhoto(data.studentPhotos, winner));
        setPickedHelperIds((current) => nextPickedIds(current.filter((id) => pool.some((student) => student.id === id)), [winner.id], pool.length, avoidRepeat));
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: winner.id, mode: "helper" });
      }
    });
  }

  async function awardBoth() {
    const targets = [mainStudent, helper].filter(Boolean) as Student[];
    if (targets.length === 0) return;
    setSavingAward(true);
    setToast("");
    try {
      playPointSound();
      const count = await addStudentStarEvents({
        student_ids: targets.map((student) => student.id),
        classroom_id: classroomId,
        subject_id: subjectId || null,
        activity_name: activity,
        reason: "ช่วยกันตอบคำถาม",
        stars: 1
      });
      setToast(`ให้ดาว ${count} คน คนละ +${formatStars(1)} แล้ว`);
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "ให้ดาวทั้งคู่ไม่สำเร็จ");
    } finally {
      setSavingAward(false);
    }
  }

  return (
    <main className="space-bg min-h-screen p-4 pt-20 text-white sm:p-6 sm:pt-6">
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:pr-48">
          <Link href="/play">
            <Button variant="light">
              <ArrowLeft className="h-4 w-4" />
              เลือกโหมด
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button data-sound="off" variant="warning" onClick={drawMain} disabled={mainRoll.isRolling || helperRoll.isRolling}>
              <RefreshCcw className="h-4 w-4" />
              {mainRoll.isRolling ? "กำลังลุ้น..." : "สุ่มคนแรก"}
            </Button>
            <Button data-sound="off" variant="secondary" onClick={drawHelper} disabled={!mainStudent || mainRoll.isRolling || helperRoll.isRolling}>
              <HeartHandshake className="h-4 w-4" />
              {helperRoll.isRolling ? "กำลังหาเพื่อน..." : "ขอเพื่อนช่วย"}
            </Button>
            <RepeatModeControl mode={repeatMode} onChange={setRepeatMode} disabled={mainRoll.isRolling || helperRoll.isRolling} />
          </div>
        </header>

        <div className="mb-5 flex justify-center">
          <TeachingSessionBadge classroom={classroom} subject={subject} activity={activity} repeatMode={repeatMode} />
        </div>

        <h1 className="display-title mb-6 text-center text-4xl font-black sm:text-6xl">ภารกิจช่วยเพื่อน</h1>
        <section className="grid gap-5 lg:grid-cols-2">
          <StudentDisplay title="ผู้เริ่มตอบ" student={displayMain} photoUrl={displayMainPhotoUrl} rolling={mainRoll.isRolling} trail={mainRoll.trail.map((student) => student.nickname)} />
          <StudentDisplay title="เพื่อนช่วยคิด" student={displayHelper} photoUrl={displayHelperPhotoUrl} rolling={helperRoll.isRolling} trail={helperRoll.trail.map((student) => student.nickname)} />
        </section>
        <div className="mt-5 flex justify-center">
          <Button variant="success" className="min-h-14 px-8 text-lg" disabled={!mainStudent || !helper || mainRoll.isRolling || helperRoll.isRolling || savingAward} onClick={() => void awardBoth()}>
            <Star className="h-5 w-5" />
            {savingAward ? "กำลังให้ดาว..." : "ตอบได้ด้วยกัน +1 ดาวทั้งคู่"}
          </Button>
        </div>
        {toast ? <p className="mx-auto mt-4 max-w-xl rounded-2xl bg-white/95 p-3 text-center font-black text-emerald-600">{toast}</p> : null}
      </div>
    </main>
  );
}

function StudentDisplay({ title, student, photoUrl, rolling, trail }: { title: string; student: Student | null; photoUrl: string | null; rolling: boolean; trail: string[] }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 text-center text-violet-950 shadow-2xl">
      <p className="text-xl font-black text-sky-600">{title}</p>
      {student ? (
        <div className={rolling ? "roll-flash" : ""}>
          <StudentAvatar name={student.full_name} photoUrl={photoUrl} size="xl" className="mx-auto mt-5" />
          <p className="mt-4 text-6xl font-black text-violet-900">{student.nickname}</p>
          <p className="text-lg font-bold text-slate-500">{student.full_name}</p>
          <RollTrail active={rolling} labels={trail} finalLabel={student.nickname} />
        </div>
      ) : (
        <div className="grid min-h-[350px] place-items-center text-2xl font-black text-slate-400">รอสุ่ม</div>
      )}
    </div>
  );
}
