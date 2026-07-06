"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgePlus, HelpCircle, Swords, Trophy, UserRound, UsersRound, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextInput } from "@/components/ui/fields";
import { RepeatModeControl } from "@/components/randomizer/repeat-mode-control";
import { classroomGroups, classroomStudents } from "@/lib/calculations";
import type { RepeatMode } from "@/lib/repeat-mode";
import { buildPlayHref } from "@/lib/url";
import { useData } from "@/components/providers/data-provider";

const modes = [
  { href: "/play/direct-award", label: "แจกดาวทันที", detail: "เลือกนักเรียนแล้วให้ดาวได้เลย", icon: BadgePlus, tone: "from-amber-300 to-orange-500", accent: "mission-card-amber", image: "/mission-cards/direct-award.png" },
  { href: "/play/individual", label: "สุ่มนักตอบ", detail: "ลุ้นชื่อนักเรียนคนถัดไป", icon: UserRound, tone: "from-emerald-400 to-sky-500", accent: "mission-card-sky", image: "/mission-cards/individual.png" },
  { href: "/play/group", label: "สุ่มทีมภารกิจ", detail: "สุ่มกลุ่มสำหรับงานทีม", icon: UsersRound, tone: "from-sky-400 to-violet-500", accent: "mission-card-blue", image: "/mission-cards/group.png" },
  { href: "/play/group-representative", label: "ตัวแทนทีมละ 1 คน", detail: "แต่ละทีมส่งตัวแทนมาตอบ", icon: Trophy, tone: "from-amber-300 to-orange-500", accent: "mission-card-amber", image: "/mission-cards/group-representative.png" },
  { href: "/play/battle", label: "ดวลตอบไวแบบทีม", detail: "สุ่มทีมคู่แข่งให้แข่งตอบ", icon: Swords, tone: "from-rose-400 to-violet-600", accent: "mission-card-rose", image: "/mission-cards/battle.png" },
  { href: "/play/battle-student", label: "ดวลตอบไวรายคน", detail: "สุ่มนักเรียน 2 คนมาดวลกัน", icon: UserRound, tone: "from-indigo-400 to-fuchsia-600", accent: "mission-card-violet", image: "/mission-cards/battle-student.png" },
  { href: "/play/helper", label: "ภารกิจช่วยเพื่อน", detail: "สุ่มเพื่อนคู่ช่วยกันคิด", icon: HelpCircle, tone: "from-pink-400 to-rose-500", accent: "mission-card-green", image: "/mission-cards/helper.png" },
  { href: "/play/boss", label: "ภารกิจบอส", detail: "โจทย์ท้าทายสำหรับดาวพิเศษ", icon: WandSparkles, tone: "from-violet-500 to-fuchsia-600", accent: "mission-card-purple", image: "/mission-cards/boss.png" }
];

export default function PlayPage() {
  const { data } = useData();
  const [classroomId, setClassroomId] = useState(data.classrooms[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("โจทย์ดาวนักคิด");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("unique");

  useEffect(() => {
    if (!classroomId && data.classrooms[0]?.id) {
      setClassroomId(data.classrooms[0].id);
    }
  }, [classroomId, data.classrooms]);

  const subjects = useMemo(() => data.subjects.filter((subject) => subject.classroom_id === classroomId), [data.subjects, classroomId]);
  const studentCount = classroomStudents(data.students, classroomId).length;
  const groupCount = classroomGroups(data.groups, classroomId).length;

  return (
    <main className="space-bg min-h-screen p-4 pt-20 text-white sm:p-6 sm:pt-6">
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:pr-48">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-violet-950 shadow-lg shadow-amber-300/25">
              ⭐ เลือกภารกิจก่อนเริ่ม
            </p>
            <h1 className="display-title mt-3 text-4xl font-black sm:text-6xl">สุ่มสนุก ดาวนักคิด</h1>
            <p className="mt-2 max-w-2xl text-base font-bold text-violet-50/80">แผงภารกิจสำหรับเปิดบนโปรเจกเตอร์ในห้องเรียน ปุ่มใหญ่ อ่านง่าย และพร้อมลุ้นทุกกิจกรรม</p>
          </div>
          <Link href="/dashboard">
            <Button variant="light">กลับศูนย์ควบคุม</Button>
          </Link>
        </header>

        <section className="mb-5 rounded-[2rem] border border-white/15 bg-white/95 p-4 text-violet-950 shadow-2xl shadow-violet-950/30 backdrop-blur md:p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-violet-700">ตั้งค่าภารกิจ</p>
              <h2 className="text-2xl font-black">เลือกห้อง วิชา และรูปแบบการสุ่ม</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700 ring-1 ring-sky-100">นักเรียน {studentCount} คน</span>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 ring-1 ring-amber-100">ทีม {groupCount} กลุ่ม</span>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.25fr_1.15fr]">
            <div>
              <Label>ห้องเรียน</Label>
              <SelectInput value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setSubjectId(""); }}>
                {data.classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <Label>รายวิชา</Label>
              <SelectInput value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                <option value="">ไม่ระบุรายวิชา</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <Label>ชื่อกิจกรรม</Label>
              <TextInput value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="เช่น ค่าประมาณจำนวนเต็มสิบ" />
            </div>
            <div>
              <Label>การสุ่มซ้ำ</Label>
              <RepeatModeControl
                mode={repeatMode}
                onChange={setRepeatMode}
                className="w-full bg-violet-950"
              />
            </div>
          </div>
        </section>

        <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modes.map((mode) => (
            <MissionCard
              key={mode.href}
              href={buildPlayHref(mode.href, { classroom: classroomId, subject: subjectId, activity, repeat: repeatMode })}
              mode={mode}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

function MissionCard({ href, mode }: { href: string; mode: (typeof modes)[number] }) {
  const Icon = mode.icon;

  return (
    <Link href={href} className={`mission-card-shell group ${mode.accent}`}>
      <div className="mission-card-inner">
        <img
          src={mode.image}
          alt=""
          aria-hidden="true"
          className="mission-card-bg"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <div className={`mission-card-fallback bg-gradient-to-br ${mode.tone}`} />
        <div className="mission-card-overlay" />

        <div className="mission-card-top">
          <span className="mission-card-icon">
            <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
          <span className="mission-card-start">START</span>
        </div>

        <div className="mission-card-copy">
          <div className="mission-card-title-box">
            <p className="mission-card-title">{mode.label}</p>
          </div>
          <p className="mission-card-detail">{mode.detail}</p>
          <span className="mission-card-cta">
            เริ่มภารกิจ <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
