"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCcw, Star, Swords, Trophy } from "lucide-react";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { RepeatModeControl } from "@/components/randomizer/repeat-mode-control";
import { TeachingSessionBadge } from "@/components/randomizer/teaching-session-badge";
import { RANDOM_DRAW_DURATION_MS } from "@/components/randomizer/use-dramatic-draw";
import { Button } from "@/components/ui/button";
import { classroomStudents, primaryStudentPhoto, randomStudentPhoto, studentGroup } from "@/lib/calculations";
import { excludedWhenUnique, isUniqueMode, nextPickedIds, type RepeatMode } from "@/lib/repeat-mode";
import { playPointSound, playRandomFinishSound, playRandomStartSound, stopRandomRollingSound } from "@/lib/sound-effects";
import { resolvePlaySession } from "@/lib/teaching-session";
import type { Group, Student } from "@/lib/types";
import { formatStars, pickOne } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

export default function StudentBattlePage() {
  const { data, addStarEvent, addStudentStarEvents, logRandom } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("โจทย์ดวลตอบไว");
  const [left, setLeft] = useState<Student | null>(null);
  const [right, setRight] = useState<Student | null>(null);
  const [leftPhotoUrl, setLeftPhotoUrl] = useState<string | null>(null);
  const [rightPhotoUrl, setRightPhotoUrl] = useState<string | null>(null);
  const [rollLeft, setRollLeft] = useState<Student | null>(null);
  const [rollRight, setRollRight] = useState<Student | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");
  const [rollingSide, setRollingSide] = useState<"both" | "left" | "right" | null>(null);
  const [savingBoth, setSavingBoth] = useState(false);
  const [toast, setToast] = useState("");
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const session = resolvePlaySession({ classrooms: data.classrooms, subjects: data.subjects, defaultActivity: "โจทย์ดวลตอบไว" });
    setClassroomId(session.classroomId);
    setSubjectId(session.subjectId);
    setActivity(session.activity);
    setRepeatMode(session.repeatMode);
  }, [data.classrooms, data.subjects]);

  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const classroom = data.classrooms.find((item) => item.id === classroomId) ?? null;
  const subject = data.subjects.find((item) => item.id === subjectId) ?? null;
  const displayLeft = rollLeft ?? left;
  const displayRight = rollRight ?? right;
  const displayLeftPhotoUrl = displayLeft
    ? rollLeft
      ? primaryStudentPhoto(data.studentPhotos, displayLeft)
      : leftPhotoUrl ?? primaryStudentPhoto(data.studentPhotos, displayLeft)
    : null;
  const displayRightPhotoUrl = displayRight
    ? rollRight
      ? primaryStudentPhoto(data.studentPhotos, displayRight)
      : rightPhotoUrl ?? primaryStudentPhoto(data.studentPhotos, displayRight)
    : null;
  const avoidRepeat = isUniqueMode(repeatMode);
  const rolling = rollingSide !== null;

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      stopRandomRollingSound();
    };
  }, []);

  function drawBattle() {
    if (students.length < 2) return;
    const excluded = excludedWhenUnique(pickedIds, students.length, 2, avoidRepeat);
    const first = pickOne(students, excluded, (student) => student.id);
    const second = first ? pickOne(students.filter((student) => student.id !== first.id), excluded, (student) => student.id) : null;
    if (!first || !second) return;

    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setLeftPhotoUrl(null);
    setRightPhotoUrl(null);
    setRollingSide("both");
    playRandomStartSound(RANDOM_DRAW_DURATION_MS);

    intervalRef.current = window.setInterval(() => {
      const previewLeft = pickOne(students);
      const previewRight = previewLeft ? pickOne(students.filter((student) => student.id !== previewLeft.id)) : null;
      setRollLeft(previewLeft);
      setRollRight(previewRight);
    }, 75);

    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRollLeft(null);
      setRollRight(null);
      setLeft(first);
      setRight(second);
      setLeftPhotoUrl(randomStudentPhoto(data.studentPhotos, first));
      setRightPhotoUrl(randomStudentPhoto(data.studentPhotos, second));
      setRollingSide(null);
      playRandomFinishSound();
      setPickedIds((current) => nextPickedIds(current, [first.id, second.id], students.length, avoidRepeat));
      void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: first.id, mode: "battle-student" });
      void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: second.id, mode: "battle-student" });
    }, RANDOM_DRAW_DURATION_MS);
  }

  function drawStudent(side: "left" | "right") {
    if (rolling || students.length < 2) return;
    const lockedStudent = side === "left" ? right : left;
    const pool = lockedStudent ? students.filter((student) => student.id !== lockedStudent.id) : students;
    const availablePicked = pickedIds.filter((id) => pool.some((student) => student.id === id));
    const excluded = excludedWhenUnique(availablePicked, pool.length, 1, avoidRepeat);
    const winner = pickOne(pool, excluded, (student) => student.id);
    if (!winner) return;

    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (side === "left") {
      setRollLeft(null);
      setLeftPhotoUrl(null);
    } else {
      setRollRight(null);
      setRightPhotoUrl(null);
    }
    setRollingSide(side);
    playRandomStartSound(RANDOM_DRAW_DURATION_MS);

    intervalRef.current = window.setInterval(() => {
      const preview = pickOne(pool);
      if (side === "left") setRollLeft(preview);
      else setRollRight(preview);
    }, 75);

    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (side === "left") {
        setRollLeft(null);
        setLeft(winner);
        setLeftPhotoUrl(randomStudentPhoto(data.studentPhotos, winner));
      } else {
        setRollRight(null);
        setRight(winner);
        setRightPhotoUrl(randomStudentPhoto(data.studentPhotos, winner));
      }
      setRollingSide(null);
      playRandomFinishSound();
      setPickedIds((current) => nextPickedIds(current, [winner.id], students.length, avoidRepeat));
      void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: winner.id, mode: "battle-student" });
    }, RANDOM_DRAW_DURATION_MS);
  }

  async function awardStudent(student: Student | null, stars: number) {
    if (!student) return;
    playPointSound();
    await addStarEvent({
      student_id: student.id,
      classroom_id: classroomId,
      subject_id: subjectId || null,
      activity_name: activity,
      reason: "ชนะดวลตอบไว",
      stars,
      event_type: "student"
    });
    setToast(`ให้ ${student.nickname} +${formatStars(stars)} ดาวแล้ว`);
  }

  async function awardBothStudents() {
    if (!left || !right || savingBoth) return;
    setSavingBoth(true);
    setToast("");
    try {
      playPointSound();
      const count = await addStudentStarEvents({
        student_ids: [left.id, right.id],
        classroom_id: classroomId,
        subject_id: subjectId || null,
        activity_name: activity,
        reason: "ชนะดวลตอบไว",
        stars: 1
      });
      setToast(`ให้ดาว ${count} คน คนละ +${formatStars(1)} แล้ว`);
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "ให้ดาวทั้งสองคนไม่สำเร็จ");
    } finally {
      setSavingBoth(false);
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
          <TeachingSessionBadge classroom={classroom} subject={subject} activity={activity} repeatMode={repeatMode} />
          <div className="flex flex-wrap gap-2">
            <Button data-sound="off" variant="warning" onClick={drawBattle} disabled={rolling || students.length < 2}>
              <RefreshCcw className="h-4 w-4" />
              {rolling ? "กำลังลุ้นคู่ดวล..." : "สุ่มคู่ดวลรายคน"}
            </Button>
            <RepeatModeControl mode={repeatMode} onChange={setRepeatMode} disabled={rolling} />
          </div>
        </header>

        <h1 className="display-title mb-6 text-center text-4xl font-black sm:text-6xl">ดวลตอบไวรายคน</h1>
        <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <StudentBattleCard
            student={displayLeft}
            photoUrl={displayLeftPhotoUrl}
            rolling={rollingSide === "both" || rollingSide === "left"}
            title="ผู้ท้าดวลคนที่ 1"
            groups={data.groups}
            onAward={() => void awardStudent(left, 1)}
            onReroll={() => drawStudent("left")}
            rerollDisabled={rolling || savingBoth}
          />
          <div className="grid place-items-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-rose-500 shadow-2xl">
              <Swords className="h-12 w-12" />
            </div>
          </div>
          <StudentBattleCard
            student={displayRight}
            photoUrl={displayRightPhotoUrl}
            rolling={rollingSide === "both" || rollingSide === "right"}
            title="ผู้ท้าดวลคนที่ 2"
            groups={data.groups}
            onAward={() => void awardStudent(right, 1)}
            onReroll={() => drawStudent("right")}
            rerollDisabled={rolling || savingBoth}
          />
        </section>
        <div className="mt-5 flex justify-center">
          <Button variant="primary" disabled={!left || !right || rolling || savingBoth} onClick={() => void awardBothStudents()}>
            <Trophy className="h-4 w-4" />
            {savingBoth ? "กำลังให้ดาว..." : "ให้ดาวทั้งสองคน"}
          </Button>
        </div>
        {toast ? <p className="mx-auto mt-4 max-w-xl rounded-2xl bg-white/95 p-3 text-center font-black text-emerald-600">{toast}</p> : null}
      </div>
    </main>
  );
}

function StudentBattleCard({
  student,
  photoUrl,
  rolling,
  title,
  groups,
  onAward,
  onReroll,
  rerollDisabled
}: {
  student: Student | null;
  photoUrl: string | null;
  rolling: boolean;
  title: string;
  groups: Group[];
  onAward: () => void;
  onReroll: () => void;
  rerollDisabled: boolean;
}) {
  const group = student ? studentGroup(groups, student) : null;

  return (
    <div className="rounded-[2rem] bg-white p-6 text-center text-violet-950 shadow-2xl">
      <p className="text-xl font-black text-rose-600">{title}</p>
      {student ? (
        <div className={rolling ? "roll-flash" : "pulse-winner"}>
          <StudentAvatar name={student.full_name} photoUrl={photoUrl} size="xl" className="mx-auto mt-5" />
          <p className="mt-4 text-6xl font-black text-violet-900">{student.nickname}</p>
          <p className="text-lg font-bold text-slate-500">{student.full_name}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-sky-50 p-3 font-black text-sky-700">เลขที่ {student.student_number}</div>
            <div className="rounded-2xl bg-violet-50 p-3 font-black text-violet-700">{group?.name ?? "ยังไม่มีกลุ่ม"}</div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button data-sound="off" variant="secondary" onClick={onReroll} disabled={rerollDisabled}>
              <RefreshCcw className="h-4 w-4" />
              สุ่มคนนี้ใหม่
            </Button>
            <Button variant="success" onClick={onAward} disabled={rolling}>
              <Star className="h-4 w-4" />
              ชนะ +1 ดาว
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[420px] place-items-center text-2xl font-black text-slate-400">รอสุ่มคู่ดวล</div>
      )}
    </div>
  );
}
