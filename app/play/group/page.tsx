"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCcw, Star, UserRound } from "lucide-react";
import { GroupIcon } from "@/components/admin/group-icon";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { RepeatModeControl } from "@/components/randomizer/repeat-mode-control";
import { RollTrail } from "@/components/randomizer/roll-trail";
import { useDramaticDraw } from "@/components/randomizer/use-dramatic-draw";
import { Button } from "@/components/ui/button";
import { classroomGroups, classroomStudents, sumStudentStars } from "@/lib/calculations";
import { excludedWhenUnique, isUniqueMode, nextPickedIds, repeatModeFromParam, type RepeatMode } from "@/lib/repeat-mode";
import { playPointSound } from "@/lib/sound-effects";
import type { Group, Student } from "@/lib/types";
import { formatStars, pickOne } from "@/lib/utils";
import { readClientParam } from "@/lib/url";
import { useData } from "@/components/providers/data-provider";

export default function GroupPlayPage() {
  const { data, addGroupMemberStarEvents, logRandom } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("กิจกรรมดาวนักคิด");
  const [selected, setSelected] = useState<Group | null>(null);
  const [member, setMember] = useState<Student | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [pickedMemberIdsByGroup, setPickedMemberIdsByGroup] = useState<Record<string, string[]>>({});
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");
  const groupRoll = useDramaticDraw<Group>();
  const memberRoll = useDramaticDraw<Student>();

  useEffect(() => {
    setClassroomId(readClientParam("classroom") || data.classrooms[0]?.id || "");
    setSubjectId(readClientParam("subject"));
    setActivity(readClientParam("activity") || "กิจกรรมดาวนักคิด");
    setRepeatMode(repeatModeFromParam(readClientParam("repeat")));
  }, [data.classrooms]);

  const groups = useMemo(() => classroomGroups(data.groups, classroomId), [data.groups, classroomId]);
  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const displayGroup = groupRoll.preview ?? selected;
  const members = displayGroup ? students.filter((student) => student.group_id === displayGroup.id) : [];
  const selectedStars = members.reduce((sum, student) => sum + sumStudentStars(data.starEvents, student.id, subjectId || null), 0);
  const displayMember = memberRoll.preview ?? member;
  const avoidRepeat = isUniqueMode(repeatMode);

  function drawGroup() {
    if (groups.length === 0) return;
    const excluded = excludedWhenUnique(pickedIds, groups.length, 1, avoidRepeat);
    const winner = pickOne(groups, excluded, (group) => group.id);
    if (!winner) return;
    setMember(null);
    memberRoll.reset();
    groupRoll.start({
      pool: groups,
      winner,
      getId: (group) => group.id,
      durationMs: 5000,
      intervalMs: 75,
      onFinish: () => {
        setSelected(winner);
        setPickedIds((current) => nextPickedIds(current, [winner.id], groups.length, avoidRepeat));
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, group_id: winner.id, mode: "group" });
      }
    });
  }

  function drawMember() {
    if (!selected) return;
    const selectedMembers = students.filter((student) => student.group_id === selected.id);
    const selectedMemberIds = pickedMemberIdsByGroup[selected.id] ?? [];
    const excluded = excludedWhenUnique(selectedMemberIds, selectedMembers.length, 1, avoidRepeat);
    const winner = pickOne(selectedMembers, excluded, (student) => student.id);
    if (!winner) return;
    memberRoll.start({
      pool: selectedMembers,
      winner,
      getId: (student) => student.id,
      durationMs: 5000,
      intervalMs: 60,
      onFinish: () => {
        setMember(winner);
        setPickedMemberIdsByGroup((current) => ({
          ...current,
          [selected.id]: nextPickedIds(current[selected.id] ?? [], [winner.id], selectedMembers.length, avoidRepeat)
        }));
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: winner.id, group_id: selected.id, mode: "group" });
      }
    });
  }

  async function award(stars: number) {
    if (!selected) return;
    playPointSound();
    await addGroupMemberStarEvents({
      group_id: selected.id,
      classroom_id: classroomId,
      subject_id: subjectId || null,
      activity_name: activity,
      reason: "ให้ดาวสมาชิกทั้งกลุ่ม",
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
          <p className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">{activity}</p>
          <RepeatModeControl mode={repeatMode} onChange={setRepeatMode} disabled={groupRoll.isRolling || memberRoll.isRolling} />
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="rounded-[2rem] bg-white/12 p-5 text-center shadow-2xl backdrop-blur">
            <h1 className="display-title mb-5 text-4xl font-black sm:text-6xl">สุ่มทีมภารกิจ</h1>
            <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-6 text-violet-950 shadow-2xl">
              {displayGroup ? (
                <div className={groupRoll.isRolling ? "roll-flash" : "pulse-winner"}>
                  <GroupIcon name={displayGroup.name} color={displayGroup.color} iconUrl={displayGroup.icon_url} size="lg" />
                  <p className="mt-4 text-6xl font-black text-violet-900">{displayGroup.name}</p>
                  <p className="text-xl font-bold text-amber-500">ดาวรวมสมาชิกปัจจุบัน {formatStars(selectedStars)} ⭐</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {members.map((student) => (
                      <StudentAvatar key={student.id} name={student.full_name} photoUrl={student.photo_url} size="sm" />
                    ))}
                  </div>
                  <RollTrail active={groupRoll.isRolling} labels={groupRoll.trail.map((group) => group.name)} finalLabel={selected?.name} />
                  {displayMember ? (
                    <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-sky-50 p-4">
                      <p className="text-sm font-bold text-sky-600">ตัวแทนกลุ่มนี้</p>
                      <p className={memberRoll.isRolling ? "name-roll text-3xl font-black text-violet-900" : "text-3xl font-black text-violet-900"}>{displayMember.nickname}</p>
                      <RollTrail active={memberRoll.isRolling} labels={memberRoll.trail.map((student) => student.nickname)} finalLabel={member?.nickname} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid min-h-[390px] place-items-center">
                  <img src="/mascot-star.svg" alt="" className="h-44 w-44 floaty" />
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] bg-white/95 p-5 text-violet-950 shadow-2xl">
            <Button data-sound="off" className="mb-3 min-h-16 w-full text-xl" variant="warning" onClick={drawGroup} disabled={groupRoll.isRolling || memberRoll.isRolling || groups.length === 0}>
              <RefreshCcw className="h-6 w-6" />
              สุ่มทีมภารกิจ
            </Button>
            <div className="grid gap-2">
              <Button variant="success" onClick={() => void award(1)} disabled={!selected || members.length === 0 || groupRoll.isRolling || memberRoll.isRolling}>
                <Star className="h-4 w-4" />
                ให้สมาชิกทุกคน +1
              </Button>
              <Button variant="primary" onClick={() => void award(2)} disabled={!selected || members.length === 0 || groupRoll.isRolling || memberRoll.isRolling}>
                <Star className="h-4 w-4" />
                ให้สมาชิกทุกคน +2
              </Button>
              <Button data-sound="off" variant="secondary" onClick={drawMember} disabled={!selected || groupRoll.isRolling || memberRoll.isRolling || members.length === 0}>
                <UserRound className="h-4 w-4" />
                สุ่มตัวแทนทีม
              </Button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
