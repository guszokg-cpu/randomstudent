"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCcw, Star } from "lucide-react";
import { GroupIcon } from "@/components/admin/group-icon";
import { RepeatModeControl } from "@/components/randomizer/repeat-mode-control";
import { RANDOM_DRAW_DURATION_MS } from "@/components/randomizer/use-dramatic-draw";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { Button } from "@/components/ui/button";
import { classroomGroups, classroomStudents, primaryStudentPhoto, randomStudentPhoto } from "@/lib/calculations";
import { excludedWhenUnique, isUniqueMode, nextPickedIds, repeatModeFromParam, type RepeatMode } from "@/lib/repeat-mode";
import { playPointSound, playRandomFinishSound, playRandomStartSound, stopRandomRollingSound } from "@/lib/sound-effects";
import type { Student } from "@/lib/types";
import { pickOne, formatStars } from "@/lib/utils";
import { readClientParam } from "@/lib/url";
import { useData } from "@/components/providers/data-provider";

export default function GroupRepresentativePage() {
  const { data, addStarEvent, addGroupMemberStarEvents, logRandom } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("กิจกรรมดาวนักคิด");
  const [representatives, setRepresentatives] = useState<Record<string, Student>>({});
  const [rollingRepresentatives, setRollingRepresentatives] = useState<Record<string, Student>>({});
  const [representativePhotos, setRepresentativePhotos] = useState<Record<string, string | null>>({});
  const [pickedIdsByGroup, setPickedIdsByGroup] = useState<Record<string, string[]>>({});
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");
  const [rolling, setRolling] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setClassroomId(readClientParam("classroom") || data.classrooms[0]?.id || "");
    setSubjectId(readClientParam("subject"));
    setActivity(readClientParam("activity") || "กิจกรรมดาวนักคิด");
    setRepeatMode(repeatModeFromParam(readClientParam("repeat")));
  }, [data.classrooms]);

  const groups = useMemo(() => classroomGroups(data.groups, classroomId), [data.groups, classroomId]);
  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const avoidRepeat = isUniqueMode(repeatMode);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      stopRandomRollingSound();
    };
  }, []);

  function drawAll() {
    const next: Record<string, Student> = {};
    groups.forEach((group) => {
      const members = students.filter((student) => student.group_id === group.id);
      const excluded = excludedWhenUnique(pickedIdsByGroup[group.id] ?? [], members.length, 1, avoidRepeat);
      const member = pickOne(members, excluded, (student) => student.id);
      if (member) next[group.id] = member;
    });
    if (Object.keys(next).length === 0) return;

    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setRolling(true);
    setRollingRepresentatives({});
    setRepresentativePhotos({});
    playRandomStartSound(RANDOM_DRAW_DURATION_MS);

    intervalRef.current = window.setInterval(() => {
      const preview: Record<string, Student> = {};
      groups.forEach((group) => {
        const member = pickOne(students.filter((student) => student.group_id === group.id));
        if (member) preview[group.id] = member;
      });
      setRollingRepresentatives(preview);
    }, 85);

    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRollingRepresentatives({});
      setRepresentatives(next);
      setRepresentativePhotos(
        Object.fromEntries(Object.entries(next).map(([groupId, student]) => [groupId, randomStudentPhoto(data.studentPhotos, student)]))
      );
      setRolling(false);
      playRandomFinishSound();
      setPickedIdsByGroup((current) => {
        const updated = { ...current };
        Object.entries(next).forEach(([groupId, member]) => {
          const members = students.filter((student) => student.group_id === groupId);
          updated[groupId] = nextPickedIds(updated[groupId] ?? [], [member.id], members.length, avoidRepeat);
        });
        return updated;
      });
      Object.entries(next).forEach(([groupId, member]) => {
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: member.id, group_id: groupId, mode: "group-representative" });
      });
    }, RANDOM_DRAW_DURATION_MS);
  }

  async function awardStudent(student: Student, stars: number) {
    playPointSound();
    await addStarEvent({
      student_id: student.id,
      classroom_id: classroomId,
      subject_id: subjectId || null,
      activity_name: activity,
      reason: "ตัวแทนกลุ่มตอบคำถาม",
      stars,
      event_type: "student"
    });
  }

  async function awardGroup(groupId: string, stars: number) {
    playPointSound();
    await addGroupMemberStarEvents({
      group_id: groupId,
      classroom_id: classroomId,
      subject_id: subjectId || null,
      activity_name: activity,
      reason: "ตัวแทนช่วยสร้างคะแนนให้สมาชิกทั้งกลุ่ม",
      stars
    });
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
          <Button data-sound="off" variant="warning" onClick={drawAll} disabled={rolling}>
            <RefreshCcw className="h-4 w-4" />
            {rolling ? "กำลังลุ้น..." : "สุ่มตัวแทนทีมละ 1 คน"}
          </Button>
          <RepeatModeControl mode={repeatMode} onChange={setRepeatMode} disabled={rolling} />
        </header>

        <h1 className="display-title mb-5 text-center text-4xl font-black sm:text-6xl">ตัวแทนทีมละ 1 คน</h1>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {groups.map((group) => {
            const student = rollingRepresentatives[group.id] ?? representatives[group.id];
            const memberCount = students.filter((item) => item.group_id === group.id).length;
            const photoUrl = student
              ? rollingRepresentatives[group.id]
                ? primaryStudentPhoto(data.studentPhotos, student)
                : representativePhotos[group.id] ?? primaryStudentPhoto(data.studentPhotos, student)
              : null;
            return (
              <div key={group.id} className="rounded-[2rem] bg-white p-5 text-center text-violet-950 shadow-2xl">
                <div className="mx-auto w-fit">
                  <GroupIcon name={group.name} color={group.color} iconUrl={group.icon_url} />
                </div>
                <p className="mt-3 text-2xl font-black">{group.name}</p>
                {student ? (
                  <div className={rolling ? "roll-flash mt-4 rounded-2xl bg-violet-50 p-4" : "mt-4 rounded-2xl bg-violet-50 p-4"}>
                    <StudentAvatar name={student.full_name} photoUrl={photoUrl} size="lg" className="mx-auto" />
                    <p className="mt-2 text-3xl font-black text-violet-900">{student.nickname}</p>
                    {rolling ? <p className="mt-1 text-sm font-black text-amber-600">กำลังหมุนชื่อ...</p> : null}
                    <div className="mt-3 grid gap-2">
                      <Button variant="success" onClick={() => void awardStudent(student, 1)} disabled={rolling}>
                        <Star className="h-4 w-4" />
                        รายคน +{formatStars(1)}
                      </Button>
                      <Button variant="primary" onClick={() => void awardGroup(group.id, 1)} disabled={rolling || memberCount === 0}>
                        <Star className="h-4 w-4" />
                        สมาชิกทุกคน +{formatStars(1)}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-5 font-bold text-slate-500">รอสุ่มตัวแทน</p>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
