"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCcw, Swords, Trophy } from "lucide-react";
import { GroupIcon } from "@/components/admin/group-icon";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { RepeatModeControl } from "@/components/randomizer/repeat-mode-control";
import { RollTrail } from "@/components/randomizer/roll-trail";
import { TeachingSessionBadge } from "@/components/randomizer/teaching-session-badge";
import { RANDOM_DRAW_DURATION_MS, useDramaticDraw } from "@/components/randomizer/use-dramatic-draw";
import { Button } from "@/components/ui/button";
import { classroomGroups, classroomStudents, primaryStudentPhoto, randomStudentPhoto } from "@/lib/calculations";
import { excludedWhenUnique, isUniqueMode, nextPickedIds, type RepeatMode } from "@/lib/repeat-mode";
import { playPointSound, playRandomFinishSound, playRandomStartSound, stopRandomRollingSound } from "@/lib/sound-effects";
import { resolvePlaySession } from "@/lib/teaching-session";
import type { Group, Student } from "@/lib/types";
import { formatStars, pickOne } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

export default function BattlePage() {
  const { data, addGroupMemberStarEvents, logRandom } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("กิจกรรมดาวนักคิด");
  const [left, setLeft] = useState<Group | null>(null);
  const [right, setRight] = useState<Group | null>(null);
  const [leftRep, setLeftRep] = useState<Student | null>(null);
  const [rightRep, setRightRep] = useState<Student | null>(null);
  const [leftRepPhotoUrl, setLeftRepPhotoUrl] = useState<string | null>(null);
  const [rightRepPhotoUrl, setRightRepPhotoUrl] = useState<string | null>(null);
  const [rollLeft, setRollLeft] = useState<Group | null>(null);
  const [rollRight, setRollRight] = useState<Group | null>(null);
  const [pickedGroupIds, setPickedGroupIds] = useState<string[]>([]);
  const [pickedRepIdsByGroup, setPickedRepIdsByGroup] = useState<Record<string, string[]>>({});
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");
  const [pairRolling, setPairRolling] = useState(false);
  const [savingBothGroups, setSavingBothGroups] = useState(false);
  const [toast, setToast] = useState("");
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const leftRepRoll = useDramaticDraw<Student>();
  const rightRepRoll = useDramaticDraw<Student>();

  useEffect(() => {
    const session = resolvePlaySession({ classrooms: data.classrooms, subjects: data.subjects, defaultActivity: "กิจกรรมดาวนักคิด" });
    setClassroomId(session.classroomId);
    setSubjectId(session.subjectId);
    setActivity(session.activity);
    setRepeatMode(session.repeatMode);
  }, [data.classrooms, data.subjects]);

  const groups = useMemo(() => classroomGroups(data.groups, classroomId), [data.groups, classroomId]);
  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const classroom = data.classrooms.find((item) => item.id === classroomId) ?? null;
  const subject = data.subjects.find((item) => item.id === subjectId) ?? null;
  const displayLeft = rollLeft ?? left;
  const displayRight = rollRight ?? right;
  const leftMemberCount = left ? students.filter((student) => student.group_id === left.id).length : 0;
  const rightMemberCount = right ? students.filter((student) => student.group_id === right.id).length : 0;
  const displayLeftRep = leftRepRoll.preview ?? leftRep;
  const displayRightRep = rightRepRoll.preview ?? rightRep;
  const displayLeftRepPhotoUrl = displayLeftRep
    ? leftRepRoll.preview
      ? primaryStudentPhoto(data.studentPhotos, displayLeftRep)
      : leftRepPhotoUrl ?? primaryStudentPhoto(data.studentPhotos, displayLeftRep)
    : null;
  const displayRightRepPhotoUrl = displayRightRep
    ? rightRepRoll.preview
      ? primaryStudentPhoto(data.studentPhotos, displayRightRep)
      : rightRepPhotoUrl ?? primaryStudentPhoto(data.studentPhotos, displayRightRep)
    : null;
  const avoidRepeat = isUniqueMode(repeatMode);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      stopRandomRollingSound();
    };
  }, []);

  function drawBattle() {
    if (groups.length < 2) return;
    const excluded = excludedWhenUnique(pickedGroupIds, groups.length, 2, avoidRepeat);
    const first = pickOne(groups, excluded, (group) => group.id);
    const second = first ? pickOne(groups.filter((group) => group.id !== first.id), excluded, (group) => group.id) : null;
    if (!first || !second) return;
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setPairRolling(true);
    setLeftRep(null);
    setRightRep(null);
    setLeftRepPhotoUrl(null);
    setRightRepPhotoUrl(null);
    leftRepRoll.reset();
    rightRepRoll.reset();
    playRandomStartSound(RANDOM_DRAW_DURATION_MS);

    intervalRef.current = window.setInterval(() => {
      const previewLeft = pickOne(groups);
      const previewRight = previewLeft ? pickOne(groups.filter((group) => group.id !== previewLeft.id)) : null;
      setRollLeft(previewLeft);
      setRollRight(previewRight);
    }, 85);

    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRollLeft(null);
      setRollRight(null);
      setLeft(first);
      setRight(second);
      setPairRolling(false);
      playRandomFinishSound();
      setPickedGroupIds((current) => nextPickedIds(current, [first.id, second.id], groups.length, avoidRepeat));
      void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, group_id: first.id, mode: "battle" });
      void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, group_id: second.id, mode: "battle" });
    }, RANDOM_DRAW_DURATION_MS);
  }

  function drawRep(group: Group | null, side: "left" | "right") {
    if (!group) return;
    const pool = students.filter((student) => student.group_id === group.id);
    const excluded = excludedWhenUnique(pickedRepIdsByGroup[group.id] ?? [], pool.length, 1, avoidRepeat);
    const member = pickOne(pool, excluded, (student) => student.id);
    if (!member) return;
    const roll = side === "left" ? leftRepRoll : rightRepRoll;
    roll.start({
      pool,
      winner: member,
      getId: (student) => student.id,
      durationMs: 5000,
      intervalMs: 60,
      onFinish: () => {
        if (side === "left") {
          setLeftRep(member);
          setLeftRepPhotoUrl(randomStudentPhoto(data.studentPhotos, member));
        } else {
          setRightRep(member);
          setRightRepPhotoUrl(randomStudentPhoto(data.studentPhotos, member));
        }
        setPickedRepIdsByGroup((current) => ({
          ...current,
          [group.id]: nextPickedIds(current[group.id] ?? [], [member.id], pool.length, avoidRepeat)
        }));
        void logRandom({ classroom_id: classroomId, subject_id: subjectId || null, student_id: member.id, group_id: group.id, mode: "battle" });
      }
    });
  }

  async function awardGroup(group: Group | null, stars: number) {
    if (!group) return;
    playPointSound();
    const count = await addGroupMemberStarEvents({
      group_id: group.id,
      classroom_id: classroomId,
      subject_id: subjectId || null,
      activity_name: activity,
      reason: "ชนะกิจกรรมคู่แข่ง",
      stars
    });
    setToast(`ให้สมาชิกกลุ่ม ${group.name} ${count} คน คนละ +${formatStars(stars)} แล้ว`);
  }

  async function awardBothGroups() {
    if (!left || !right || savingBothGroups) return;
    setSavingBothGroups(true);
    setToast("");
    try {
      playPointSound();
      const leftCount = await addGroupMemberStarEvents({
        group_id: left.id,
        classroom_id: classroomId,
        subject_id: subjectId || null,
        activity_name: activity,
        reason: "ชนะกิจกรรมคู่แข่ง",
        stars: 1
      });
      const rightCount = await addGroupMemberStarEvents({
        group_id: right.id,
        classroom_id: classroomId,
        subject_id: subjectId || null,
        activity_name: activity,
        reason: "ชนะกิจกรรมคู่แข่ง",
        stars: 1
      });
      setToast(`ให้ดาวสมาชิกทั้งสองทีมรวม ${leftCount + rightCount} คน คนละ +${formatStars(1)} แล้ว`);
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "ให้ดาวสมาชิกทั้งสองทีมไม่สำเร็จ");
    } finally {
      setSavingBothGroups(false);
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
          <Button data-sound="off" variant="warning" onClick={drawBattle} disabled={pairRolling || leftRepRoll.isRolling || rightRepRoll.isRolling}>
            <RefreshCcw className="h-4 w-4" />
            {pairRolling ? "กำลังลุ้นคู่แข่ง..." : "ดวลตอบไวแบบทีม"}
          </Button>
          <RepeatModeControl mode={repeatMode} onChange={setRepeatMode} disabled={pairRolling || leftRepRoll.isRolling || rightRepRoll.isRolling} />
        </header>

        <div className="mb-5 flex justify-center">
          <TeachingSessionBadge classroom={classroom} subject={subject} activity={activity} repeatMode={repeatMode} />
        </div>

        <h1 className="display-title mb-6 text-center text-4xl font-black sm:text-6xl">ดวลตอบไวแบบทีม</h1>
        <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <BattleCard
            group={displayLeft}
            rep={displayLeftRep}
            repPhotoUrl={displayLeftRepPhotoUrl}
            rolling={pairRolling}
            repRolling={leftRepRoll.isRolling}
            repTrail={leftRepRoll.trail.map((student) => student.nickname)}
            onDrawRep={() => drawRep(left, "left")}
            memberCount={leftMemberCount}
            onAward={() => void awardGroup(left, 1)}
          />
          <div className="grid place-items-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-4xl font-black text-rose-500 shadow-2xl">
              <Swords className="h-12 w-12" />
            </div>
          </div>
          <BattleCard
            group={displayRight}
            rep={displayRightRep}
            repPhotoUrl={displayRightRepPhotoUrl}
            rolling={pairRolling}
            repRolling={rightRepRoll.isRolling}
            repTrail={rightRepRoll.trail.map((student) => student.nickname)}
            onDrawRep={() => drawRep(right, "right")}
            memberCount={rightMemberCount}
            onAward={() => void awardGroup(right, 1)}
          />
        </section>
        <div className="mt-5 flex justify-center">
          <Button variant="primary" disabled={!left || !right || leftMemberCount === 0 || rightMemberCount === 0 || pairRolling || leftRepRoll.isRolling || rightRepRoll.isRolling || savingBothGroups} onClick={() => void awardBothGroups()}>
            <Trophy className="h-4 w-4" />
            {savingBothGroups ? "กำลังให้ดาว..." : "ให้สมาชิกทั้งสองทีม"}
          </Button>
        </div>
        {toast ? <p className="mx-auto mt-4 max-w-xl rounded-2xl bg-white/95 p-3 text-center font-black text-emerald-600">{toast}</p> : null}
      </div>
    </main>
  );
}

function BattleCard({
  group,
  rep,
  repPhotoUrl,
  rolling,
  repRolling,
  repTrail,
  onDrawRep,
  onAward,
  memberCount
}: {
  group: Group | null;
  rep: Student | null;
  repPhotoUrl: string | null;
  rolling: boolean;
  repRolling: boolean;
  repTrail: string[];
  memberCount: number;
  onDrawRep: () => void;
  onAward: () => void;
}) {
  return (
    <div className="rounded-[2rem] bg-white p-6 text-center text-violet-950 shadow-2xl">
      {group ? (
        <>
          <div className={rolling ? "roll-flash mx-auto w-fit" : "mx-auto w-fit"}>
            <GroupIcon name={group.name} color={group.color} iconUrl={group.icon_url} size="lg" />
          </div>
          <p className="mt-4 text-5xl font-black">{group.name}</p>
          {rolling ? <RollTrail active labels={[group.name]} /> : null}
          {rep ? (
            <div className="mx-auto mt-4 max-w-xs rounded-2xl bg-sky-50 p-4">
              <StudentAvatar name={rep.full_name} photoUrl={repPhotoUrl} size="lg" className="mx-auto" />
              <p className={repRolling ? "name-roll mt-2 text-3xl font-black" : "mt-2 text-3xl font-black"}>{rep.nickname}</p>
              <RollTrail active={repRolling} labels={repTrail} finalLabel={rep.nickname} />
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button data-sound="off" variant="secondary" onClick={onDrawRep} disabled={rolling || repRolling}>สุ่มตัวแทน</Button>
            <Button variant="success" onClick={onAward} disabled={rolling || repRolling || memberCount === 0}>สมาชิกทุกคน +1</Button>
          </div>
        </>
      ) : (
        <div className="grid min-h-[360px] place-items-center text-2xl font-black text-slate-400">รอสุ่มกลุ่ม</div>
      )}
    </div>
  );
}
