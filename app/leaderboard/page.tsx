"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Crown, Medal, Star } from "lucide-react";
import { GroupIcon } from "@/components/admin/group-icon";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { Button } from "@/components/ui/button";
import { Label, SelectInput } from "@/components/ui/fields";
import { primaryStudentPhoto, topGroups, topStudents } from "@/lib/calculations";
import { formatStars } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

export default function LeaderboardPage() {
  const { data } = useData();
  const [classroomId, setClassroomId] = useState(data.classrooms[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [tab, setTab] = useState<"student" | "group">("student");
  const subjects = useMemo(() => data.subjects.filter((subject) => subject.classroom_id === classroomId), [data.subjects, classroomId]);
  const studentRows = topStudents(data, classroomId, subjectId || null, 10);
  const groupRows = topGroups(data, classroomId, subjectId || null, 10);
  const podium = studentRows.slice(0, 3);

  return (
    <main className="space-bg min-h-screen p-4 text-white sm:p-6">
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link href="/dashboard">
              <Button variant="light">
                <ArrowLeft className="h-4 w-4" />
                กลับหน้าครู
              </Button>
            </Link>
            <h1 className="display-title mt-4 text-5xl font-black sm:text-7xl">กระดานดาว</h1>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] bg-white/95 p-4 text-violet-950 shadow-2xl md:grid-cols-3">
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
                <option value="">ทุกวิชา</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div className="flex items-end gap-2">
              <Button className="flex-1" variant={tab === "student" ? "primary" : "light"} onClick={() => setTab("student")}>รายคน</Button>
              <Button className="flex-1" variant={tab === "group" ? "primary" : "light"} onClick={() => setTab("group")}>รายกลุ่ม</Button>
            </div>
          </div>
        </header>

        {tab === "student" ? (
          <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="rounded-[2rem] bg-white p-6 text-violet-950 shadow-2xl">
              <div className="grid min-h-[430px] items-end gap-4 md:grid-cols-3">
                {[podium[1], podium[0], podium[2]].map((row, visualIndex) => {
                  const place = visualIndex === 1 ? 1 : visualIndex === 0 ? 2 : 3;
                  const height = place === 1 ? "h-36" : place === 2 ? "h-28" : "h-24";
                  return (
                    <div key={place} className="text-center">
                      {row ? (
                        <>
                          <div className="relative mx-auto w-fit">
                            {place === 1 ? <Crown className="absolute -top-10 left-1/2 h-12 w-12 -translate-x-1/2 fill-amber-300 text-amber-300" /> : null}
                            <StudentAvatar name={row.student.full_name} photoUrl={primaryStudentPhoto(data.studentPhotos, row.student)} size={place === 1 ? "xl" : "lg"} className="mx-auto" />
                          </div>
                          <p className="mt-3 text-3xl font-black text-violet-950">{row.student.nickname}</p>
                          <p className="text-2xl font-black text-amber-500">{formatStars(row.stars)} ⭐</p>
                        </>
                      ) : (
                        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-slate-100 text-slate-400">?</div>
                      )}
                      <div className={`mt-4 grid ${height} place-items-center rounded-t-3xl bg-gradient-to-br ${place === 1 ? "from-amber-300 to-orange-500" : place === 2 ? "from-slate-300 to-slate-500" : "from-orange-300 to-amber-700"} text-5xl font-black text-white shadow-lg`}>
                        {place}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <RankPanel title="อันดับรายคน" rows={studentRows.map(({ student, stars }) => ({ id: student.id, name: student.nickname, stars }))} />
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="rounded-[2rem] bg-white p-6 text-violet-950 shadow-2xl">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groupRows.slice(0, 6).map(({ group, stars }, index) => (
                  <div key={group.id} className="rounded-[1.5rem] bg-violet-50 p-5 text-center">
                    <div className="mx-auto mb-3 w-fit">
                      <GroupIcon name={group.name} color={group.color} iconUrl={group.icon_url} size="lg" />
                    </div>
                    <p className="text-2xl font-black">{group.name}</p>
                    <p className="font-black text-amber-500">{formatStars(stars)} ⭐</p>
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-black text-violet-700">
                      <Medal className="h-4 w-4" />
                      อันดับ {index + 1}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <RankPanel title="อันดับกลุ่มจากดาวสมาชิก" rows={groupRows.map(({ group, stars }) => ({ id: group.id, name: group.name, stars }))} />
          </section>
        )}
      </div>
    </main>
  );
}

function RankPanel({ title, rows }: { title: string; rows: Array<{ id: string; name: string; stars: number }> }) {
  return (
    <aside className="rounded-[2rem] bg-white/12 p-4 shadow-2xl backdrop-blur">
      <h2 className="mb-4 text-center text-2xl font-black">{title}</h2>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-center justify-between rounded-2xl bg-white p-3 text-violet-950">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 font-black text-amber-700">{index + 1}</span>
              <span className="font-black">{row.name}</span>
            </div>
            <span className="flex items-center gap-1 font-black text-amber-500">
              {formatStars(row.stars)}
              <Star className="h-4 w-4 fill-current" />
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
