"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, RefreshCcw, SkipForward, Star } from "lucide-react";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { RepeatModeControl } from "@/components/randomizer/repeat-mode-control";
import { RollTrail } from "@/components/randomizer/roll-trail";
import { TeachingSessionBadge } from "@/components/randomizer/teaching-session-badge";
import { useDramaticDraw } from "@/components/randomizer/use-dramatic-draw";
import { Button } from "@/components/ui/button";
import { classroomStudents, primaryStudentPhoto, randomStudentPhoto, studentGroup, sumStudentStars } from "@/lib/calculations";
import { isUniqueMode, type RepeatMode } from "@/lib/repeat-mode";
import { STAR_SETTINGS } from "@/lib/star-settings";
import { playPointSound } from "@/lib/sound-effects";
import { resolvePlaySession } from "@/lib/teaching-session";
import type { Student } from "@/lib/types";
import { formatStars, pickOne } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

export default function IndividualPlayPage() {
  const { data, addStarEvent, logRandom } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("กิจกรรมดาวนักคิด");
  const [selected, setSelected] = useState<Student | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");
  const [toast, setToast] = useState("");
  const [isQuickAwarding, setIsQuickAwarding] = useState(false);
  const [quickAwardPulse, setQuickAwardPulse] = useState(false);
  const [lastProfileTapAt, setLastProfileTapAt] = useState(0);
  const quickAwardingRef = useRef(false);
  const studentRoll = useDramaticDraw<Student>();

  useEffect(() => {
    const session = resolvePlaySession({ classrooms: data.classrooms, subjects: data.subjects, defaultActivity: "กิจกรรมดาวนักคิด" });
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
  const group = displayStudent ? studentGroup(data.groups, displayStudent) : null;
  const selectedStars = displayStudent ? sumStudentStars(data.starEvents, displayStudent.id, subjectId || null) : 0;
  const avoidRepeat = isUniqueMode(repeatMode);

  function drawStudent() {
    if (students.length === 0) return;
    const nextExcluded = avoidRepeat && pickedIds.length < students.length ? pickedIds : [];
    const winner = pickOne(students, nextExcluded, (student) => student.id);
    if (!winner) return;
    setToast("");
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
        setPickedIds((current) => {
          const shouldReset = !avoidRepeat || current.length + 1 >= students.length;
          return shouldReset ? [winner.id] : [...current, winner.id];
        });
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: winner.id, mode: "individual" });
      }
    });
  }

  async function award(reason: string, stars: number) {
    if (!selected) return false;
    try {
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
      setToast(`ให้ ${selected.nickname} +${formatStars(stars)} ดาวแล้ว`);
      return true;
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "ให้ดาวไม่สำเร็จ");
      return false;
    }
  }

  async function handleProfileQuickAward() {
    if (!selected || studentRoll.isRolling || quickAwardingRef.current) return;
    quickAwardingRef.current = true;
    setIsQuickAwarding(true);
    const success = await award("ตอบถูก", 1);
    if (success) {
      setQuickAwardPulse(true);
      window.setTimeout(() => setQuickAwardPulse(false), 900);
    }
    setIsQuickAwarding(false);
    quickAwardingRef.current = false;
  }

  function handleProfilePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") return;
    const now = Date.now();
    if (now - lastProfileTapAt <= 420) {
      setLastProfileTapAt(0);
      void handleProfileQuickAward();
      return;
    }
    setLastProfileTapAt(now);
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
          <RepeatModeControl mode={repeatMode} onChange={setRepeatMode} disabled={studentRoll.isRolling} />
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="rounded-[2rem] bg-white/12 p-5 text-center shadow-2xl backdrop-blur">
            <p className="text-xl font-bold text-amber-200">{activity}</p>
            <h1 className="display-title mb-5 text-4xl font-black sm:text-6xl">สุ่มนักตอบ</h1>

            <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-4 text-violet-950 shadow-2xl sm:p-6">
              {displayStudent ? (
                <div className={studentRoll.isRolling ? "roll-flash" : "pulse-winner"}>
                  <div className="relative mx-auto w-full max-w-[440px]">
                    <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-br from-amber-300/65 via-pink-300/40 to-sky-300/55 blur-xl" />
                    <button
                      type="button"
                      className="relative mx-auto block cursor-pointer rounded-[2rem] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:cursor-not-allowed"
                      title="ดับเบิลคลิกที่รูปเพื่อให้ +1"
                      aria-label={`ดับเบิลคลิกที่รูปของ ${displayStudent.nickname} เพื่อให้ตอบถูก +1`}
                      onDoubleClick={() => void handleProfileQuickAward()}
                      onPointerUp={handleProfilePointerUp}
                      disabled={!selected || studentRoll.isRolling || isQuickAwarding}
                    >
                      <StudentAvatar
                        name={displayStudent.full_name}
                        photoUrl={displayPhotoUrl}
                        size="hero"
                        shape="rounded"
                        className={`relative mx-auto ring-8 ring-white/70 ${quickAwardPulse ? "quick-award-profile" : ""}`}
                      />
                      {quickAwardPulse ? (
                        <span className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-emerald-500 px-5 py-2 text-xl font-black text-white shadow-2xl">
                          +1 ⭐
                        </span>
                      ) : null}
                      {isQuickAwarding ? (
                        <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-[2rem] bg-violet-950/35 text-lg font-black text-white backdrop-blur-sm">
                          บันทึก +1...
                        </span>
                      ) : null}
                    </button>
                  </div>
                  <p className="mt-3 text-sm font-black text-emerald-600">ดับเบิลคลิกที่รูปเพื่อให้ +1</p>
                  <p className="mt-5 text-5xl font-black text-violet-900 sm:text-7xl">{displayStudent.nickname}</p>
                  <p className="text-lg font-bold text-slate-500 sm:text-2xl">{displayStudent.full_name}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl bg-sky-50 p-3 font-black text-sky-700">เลขที่ {displayStudent.student_number}</div>
                    <div className="rounded-2xl bg-violet-50 p-3 font-black text-violet-700">{group?.name ?? "ยังไม่มีกลุ่ม"}</div>
                    <div className="rounded-2xl bg-amber-50 p-3 font-black text-amber-600">{formatStars(selectedStars)} ⭐</div>
                  </div>
                  <RollTrail
                    active={studentRoll.isRolling}
                    labels={studentRoll.trail.map((student) => student.nickname)}
                    finalLabel={selected?.nickname}
                  />
                </div>
              ) : (
                <div className="grid min-h-[390px] place-items-center">
                  <div>
                    <img src="/mascot-star.svg" alt="" className="mx-auto h-40 w-40 floaty" />
                    <p className="mt-4 text-3xl font-black text-violet-900">พร้อมสุ่มชื่อแล้ว</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] bg-white/95 p-5 text-violet-950 shadow-2xl">
            <Button data-sound="off" className="mb-3 min-h-16 w-full text-xl" variant="warning" onClick={drawStudent} disabled={studentRoll.isRolling || students.length === 0}>
              <RefreshCcw className="h-6 w-6" />
              สุ่มนักตอบ
            </Button>
            <div className="grid gap-2">
              {STAR_SETTINGS.slice(0, 3).map((setting) => (
                <Button key={setting.reason} variant={setting.tone === "green" ? "success" : setting.tone === "purple" ? "primary" : "warning"} onClick={() => void award(setting.reason, setting.stars)} disabled={!selected || studentRoll.isRolling || isQuickAwarding}>
                  <Star className="h-4 w-4" />
                  {setting.label} +{formatStars(setting.stars)}
                </Button>
              ))}
              <Button data-sound="off" variant="light" onClick={drawStudent} disabled={studentRoll.isRolling || students.length === 0}>
                <SkipForward className="h-4 w-4" />
                ข้ามคนนี้
              </Button>
            </div>
            {toast ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-center font-black text-emerald-600">{toast}</p> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
