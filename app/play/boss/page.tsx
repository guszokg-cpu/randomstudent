"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Crown, RefreshCcw, Star } from "lucide-react";
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
import { pickOne } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

export default function BossPage() {
  const { data, addStarEvent, logRandom } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("ภารกิจบอส");
  const [selected, setSelected] = useState<Student | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");
  const studentRoll = useDramaticDraw<Student>();

  useEffect(() => {
    const session = resolvePlaySession({ classrooms: data.classrooms, subjects: data.subjects, defaultActivity: "ภารกิจบอส" });
    setClassroomId(session.classroomId);
    setSubjectId(session.subjectId);
    setActivity(session.activity);
    setRepeatMode(session.repeatMode);
  }, [data.classrooms, data.subjects]);

  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const classroom = data.classrooms.find((item) => item.id === classroomId) ?? null;
  const subject = data.subjects.find((item) => item.id === subjectId) ?? null;
  const displayStudent = studentRoll.preview ?? selected;
  const displayPhotoUrl = displayStudent
    ? studentRoll.preview
      ? primaryStudentPhoto(data.studentPhotos, displayStudent)
      : selectedPhotoUrl ?? primaryStudentPhoto(data.studentPhotos, displayStudent)
    : null;
  const avoidRepeat = isUniqueMode(repeatMode);

  function drawStudent() {
    const excluded = excludedWhenUnique(pickedIds, students.length, 1, avoidRepeat);
    const winner = pickOne(students, excluded, (student) => student.id);
    if (!winner) return;
    setSelectedPhotoUrl(null);
    studentRoll.start({
      pool: students,
      winner,
      getId: (student) => student.id,
      durationMs: 5000,
      intervalMs: 65,
      onFinish: () => {
        setSelected(winner);
        setSelectedPhotoUrl(randomStudentPhoto(data.studentPhotos, winner));
        setPickedIds((current) => nextPickedIds(current, [winner.id], students.length, avoidRepeat));
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: winner.id, mode: "boss" });
      }
    });
  }

  async function award(reason: string, stars: number) {
    if (!selected) return;
    playPointSound();
    await addStarEvent({
      student_id: selected.id,
      classroom_id: classroomId,
      subject_id: subjectId || null,
      activity_name: activity,
      reason,
      stars,
      event_type: "student"
    });
  }

  return (
    <main className="space-bg min-h-screen p-4 pt-20 text-white sm:p-6 sm:pt-6">
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:pr-48">
          <Link href="/play">
            <Button variant="light">
              <ArrowLeft className="h-4 w-4" />
              เลือกโหมด
            </Button>
          </Link>
          <Button data-sound="off" variant="warning" onClick={drawStudent} disabled={studentRoll.isRolling}>
            <RefreshCcw className="h-4 w-4" />
            {studentRoll.isRolling ? "กำลังลุ้นผู้พิชิต..." : "สุ่มภารกิจ"}
          </Button>
          <RepeatModeControl mode={repeatMode} onChange={setRepeatMode} disabled={studentRoll.isRolling} />
        </header>

        <div className="mb-5 flex justify-center">
          <TeachingSessionBadge classroom={classroom} subject={subject} activity={activity} repeatMode={repeatMode} />
        </div>

        <section className="rounded-[2rem] bg-white/12 p-6 text-center shadow-2xl backdrop-blur">
          <Crown className="mx-auto mb-3 h-16 w-16 fill-amber-300 text-amber-300" />
          <h1 className="display-title text-5xl font-black sm:text-7xl">ภารกิจบอส</h1>
          <p className="mt-2 text-xl font-bold text-amber-100">ภารกิจท้าทายสำหรับนักคิดคนเก่ง</p>

          <div className="mx-auto mt-6 max-w-xl rounded-[2rem] bg-white p-6 text-violet-950 shadow-2xl">
            {displayStudent ? (
              <div className={studentRoll.isRolling ? "roll-flash" : "pulse-winner"}>
                <StudentAvatar name={displayStudent.full_name} photoUrl={displayPhotoUrl} size="xl" className="mx-auto" />
                <p className="mt-4 text-6xl font-black text-violet-900">{displayStudent.nickname}</p>
                <p className="text-lg font-bold text-slate-500">{displayStudent.full_name}</p>
                <RollTrail active={studentRoll.isRolling} labels={studentRoll.trail.map((student) => student.nickname)} finalLabel={selected?.nickname} />
              </div>
            ) : (
              <div className="grid min-h-[350px] place-items-center text-2xl font-black text-slate-400">รอสุ่มผู้พิชิตภารกิจ</div>
            )}
          </div>

          <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
            <Button variant="primary" className="min-h-14 text-lg" disabled={!selected || studentRoll.isRolling} onClick={() => void award("ผ่านภารกิจท้าทาย", 3)}>
              <Star className="h-5 w-5" />
              ผ่านภารกิจ +3
            </Button>
            <Button variant="warning" className="min-h-14 text-lg" disabled={!selected || studentRoll.isRolling} onClick={() => void award("พยายามดี", 1)}>
              <Star className="h-5 w-5" />
              พยายามดี +1
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
