"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Search, Star, UsersRound, Zap } from "lucide-react";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { TeachingSessionBadge } from "@/components/randomizer/teaching-session-badge";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextArea, TextInput } from "@/components/ui/fields";
import { classroomGroups, classroomStudents, sumStudentStars } from "@/lib/calculations";
import { playPointSound } from "@/lib/sound-effects";
import { STAR_SETTINGS } from "@/lib/star-settings";
import { resolvePlaySession } from "@/lib/teaching-session";
import { cn, formatStars } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

type TargetMode = "student" | "group";

export default function DirectAwardPage() {
  const { data, addStudentStarEvents, addGroupMemberStarEvents } = useData();
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [activity, setActivity] = useState("ตอบคำถามในห้อง");
  const [activitySuggestionsOpen, setActivitySuggestionsOpen] = useState(false);
  const [recentActivityNames, setRecentActivityNames] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<TargetMode>("student");
  const [query, setQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [customReason, setCustomReason] = useState("ตอบคำถามในห้อง");
  const [customStars, setCustomStars] = useState("1");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const session = resolvePlaySession({ classrooms: data.classrooms, subjects: data.subjects, defaultActivity: "ตอบคำถามในห้อง" });
    setClassroomId(session.classroomId);
    setSubjectId(session.subjectId);
    setActivity(session.activity);
  }, [data.classrooms, data.subjects]);

  const subjects = useMemo(() => data.subjects.filter((subject) => subject.classroom_id === classroomId), [classroomId, data.subjects]);
  const students = useMemo(() => classroomStudents(data.students, classroomId), [classroomId, data.students]);
  const groups = useMemo(() => classroomGroups(data.groups, classroomId), [classroomId, data.groups]);
  const classroom = data.classrooms.find((item) => item.id === classroomId) ?? null;
  const subject = data.subjects.find((item) => item.id === subjectId) ?? null;
  const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id));
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const selectedGroupMembers = selectedGroup ? students.filter((student) => student.group_id === selectedGroup.id) : [];
  const selectedStudentPreview = selectedStudents.slice(0, 4).map((student) => student.nickname).join(", ");
  const selectedName =
    targetMode === "student"
      ? selectedStudents.length === 1
        ? selectedStudents[0].nickname
        : selectedStudents.length > 1
          ? `นักเรียน ${selectedStudents.length} คน`
          : null
      : selectedGroup?.name;
  const awardDisabled = saving || (targetMode === "student" ? selectedStudents.length === 0 : !selectedGroup || selectedGroupMembers.length === 0);
  const activityOptions = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    const pushName = (value: string) => {
      const name = value.trim();
      const key = name.toLocaleLowerCase("th-TH");
      if (!name || seen.has(key)) return;
      seen.add(key);
      names.push(name);
    };

    recentActivityNames.forEach(pushName);
    [...data.starEvents]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .forEach((event) => pushName(event.activity_name));

    return names.slice(0, 50);
  }, [data.starEvents, recentActivityNames]);
  const filteredActivityOptions = useMemo(() => {
    const keyword = activity.trim().toLocaleLowerCase("th-TH");
    if (!keyword) return activityOptions.slice(0, 8);
    return activityOptions.filter((name) => name.toLocaleLowerCase("th-TH").includes(keyword)).slice(0, 8);
  }, [activity, activityOptions]);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return students;
    return students.filter((student) => {
      const numberText = String(student.student_number);
      return (
        numberText.includes(normalized) ||
        student.full_name.toLowerCase().includes(normalized) ||
        student.nickname.toLowerCase().includes(normalized) ||
        student.student_code.toLowerCase().includes(normalized)
      );
    });
  }, [query, students]);
  const visibleStudentIds = useMemo(() => filteredStudents.map((student) => student.id), [filteredStudents]);
  const allVisibleStudentsSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((studentId) => selectedStudentIds.includes(studentId));

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(normalized));
  }, [groups, query]);

  function rememberActivityName(value: string) {
    const name = value.trim();
    if (!name) return;
    const key = name.toLocaleLowerCase("th-TH");
    setRecentActivityNames((current) => [name, ...current.filter((item) => item.trim().toLocaleLowerCase("th-TH") !== key)].slice(0, 20));
  }

  function chooseActivityName(name: string) {
    setActivity(name);
    setActivitySuggestionsOpen(false);
  }

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [activity, classroomId, subjectId]);

  function handleClassroomChange(nextClassroomId: string) {
    setClassroomId(nextClassroomId);
    setSubjectId("");
    setSelectedStudentIds([]);
    setSelectedGroupId("");
    setQuery("");
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
  }

  function toggleVisibleStudents() {
    if (visibleStudentIds.length === 0) return;
    setSelectedStudentIds((current) => {
      if (allVisibleStudentsSelected) {
        return current.filter((studentId) => !visibleStudentIds.includes(studentId));
      }
      return Array.from(new Set([...current, ...visibleStudentIds]));
    });
  }

  async function award(reason: string, stars: number) {
    const targetId = selectedGroup?.id;
    if (saving) return;
    if (targetMode === "student" && selectedStudentIds.length === 0) return;
    if (targetMode === "group" && !targetId) return;

    setSaving(true);
    setToast("");
    try {
      playPointSound();
      if (targetMode === "group") {
        if (!selectedGroup) return;
        const count = await addGroupMemberStarEvents({
          group_id: selectedGroup.id,
          classroom_id: classroomId,
          subject_id: subjectId || null,
          activity_name: activity,
          reason: reason.trim() || "แจกดาวทันทีให้ทั้งกลุ่ม",
          stars
        });
        rememberActivityName(activity);
        setToast(`ให้สมาชิกกลุ่ม ${selectedName ?? "กลุ่ม"} ${count} คน คนละ +${formatStars(stars)} ดาวแล้ว`);
      } else {
        const awardedIds = [...selectedStudentIds];
        const awardedReason = reason.trim() || "แจกดาวทันที";
        const count = await addStudentStarEvents({
          student_ids: awardedIds,
          classroom_id: classroomId,
          subject_id: subjectId || null,
          activity_name: activity,
          reason: awardedReason,
          stars
        });
        rememberActivityName(activity);
        setSelectedStudentIds([]);
        setToast(`ให้ดาวนักเรียน ${count} คน คนละ +${formatStars(stars)} ดาวแล้ว`);
      }
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "ให้ดาวไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function awardCustom() {
    const stars = Number(customStars);
    if (!Number.isFinite(stars) || stars <= 0) {
      setToast("กรุณาใส่จำนวนดาวมากกว่า 0");
      return;
    }
    await award(customReason, stars);
  }

  return (
    <main className="space-bg min-h-screen p-4 pt-20 text-white sm:p-6 sm:pt-6">
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:pr-48">
          <Link href="/play">
            <Button variant="light">
              <ArrowLeft className="h-4 w-4" />
              เลือกโหมด
            </Button>
          </Link>
          <TeachingSessionBadge classroom={classroom} subject={subject} activity={activity} />
          <Link href="/dashboard">
            <Button variant="ghost" className="bg-white/10 text-white hover:bg-white/15">
              กลับหน้าครู
            </Button>
          </Link>
        </header>

        <section className="mb-5 rounded-[2rem] bg-white/95 p-5 text-violet-950 shadow-2xl">
          <div className="mb-4">
            <p className="font-bold text-amber-600">ไม่ต้องสุ่ม</p>
            <h1 className="text-4xl font-black sm:text-5xl">แจกดาวทันที</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">ใช้ตอนเด็กตอบคำถาม ช่วยเพื่อน หรือทำกิจกรรมดี แล้วครูกดให้ดาวได้เลย</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[220px_220px_1fr_220px]">
            <div>
              <Label>ห้องเรียน</Label>
              <SelectInput value={classroomId} onChange={(event) => handleClassroomChange(event.target.value)}>
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
              <div className="relative">
                <TextInput
                  value={activity}
                  onChange={(event) => {
                    setActivity(event.target.value);
                    setActivitySuggestionsOpen(true);
                  }}
                  onFocus={() => setActivitySuggestionsOpen(true)}
                  onBlur={() => window.setTimeout(() => setActivitySuggestionsOpen(false), 120)}
                  placeholder="เช่น ตอบคำถามในห้อง"
                  autoComplete="off"
                />
                {activitySuggestionsOpen ? (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl shadow-violet-950/15">
                    <div className="flex items-center justify-between gap-3 border-b border-violet-50 px-3 py-2">
                      <p className="text-xs font-black text-violet-700">กิจกรรมย้อนหลัง</p>
                      {activityOptions.length > 0 ? <p className="text-[11px] font-bold text-slate-400">ล่าสุดก่อน</p> : null}
                    </div>
                    {activityOptions.length === 0 ? (
                      <p className="px-3 py-3 text-sm font-bold text-slate-500">ยังไม่มีกิจกรรมย้อนหลัง</p>
                    ) : filteredActivityOptions.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto p-1">
                        {filteredActivityOptions.map((name) => {
                          const selected = activity.trim().toLocaleLowerCase("th-TH") === name.toLocaleLowerCase("th-TH");
                          return (
                            <button
                              key={name}
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-black transition",
                                selected ? "bg-violet-50 text-violet-800" : "text-violet-950 hover:bg-violet-50"
                              )}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                chooseActivityName(name);
                              }}
                            >
                              <span className="truncate">{name}</span>
                              {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="px-3 py-3 text-sm font-bold text-slate-500">ไม่พบกิจกรรมย้อนหลังที่ตรงกับคำค้น พิมพ์ชื่อใหม่ได้เลย</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <Label>ให้ดาวกับ</Label>
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  className={cn("min-h-10 rounded-lg text-sm font-black transition", targetMode === "student" ? "bg-white text-violet-800 shadow-sm" : "text-slate-500")}
                  onClick={() => setTargetMode("student")}
                >
                  นักเรียน
                </button>
                <button
                  type="button"
                  className={cn("min-h-10 rounded-lg text-sm font-black transition", targetMode === "group" ? "bg-white text-violet-800 shadow-sm" : "text-slate-500")}
                  onClick={() => setTargetMode("group")}
                >
                  กลุ่ม
                </button>
              </div>
              {targetMode === "group" ? <p className="mt-1 text-xs font-bold text-slate-500">ให้ดาวรายคนกับสมาชิกปัจจุบันทุกคน</p> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-[2rem] bg-white/95 p-5 text-violet-950 shadow-2xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">{targetMode === "student" ? "เลือกนักเรียน" : "เลือกกลุ่ม"}</h2>
                <p className="text-sm font-semibold text-slate-500">
                  {targetMode === "student"
                    ? `นักเรียน ${students.length} คน · เลือกแล้ว ${selectedStudents.length} คน`
                    : `เลือกกลุ่มแล้วกระจายดาวให้สมาชิกปัจจุบันทุกคน`}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:max-w-xl lg:flex-row lg:items-center lg:justify-end">
                {targetMode === "student" ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={allVisibleStudentsSelected ? "warning" : "light"}
                      className="min-h-11 whitespace-nowrap px-3 text-xs"
                      onClick={toggleVisibleStudents}
                      disabled={filteredStudents.length === 0}
                    >
                      {allVisibleStudentsSelected ? "เอาที่แสดงออก" : query.trim() ? "เลือกที่ค้นหา" : "เลือกทุกคน"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 whitespace-nowrap px-3 text-xs"
                      onClick={() => setSelectedStudentIds([])}
                      disabled={selectedStudentIds.length === 0}
                    >
                      ล้างที่เลือก
                    </Button>
                  </div>
                ) : null}
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขที่ ชื่อ หรือชื่อเล่น" />
                </div>
              </div>
            </div>

            {targetMode === "student" ? (
              <>
              {filteredStudents.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredStudents.map((student) => {
                  const active = selectedStudentIds.includes(student.id);
                  const totalStars = sumStudentStars(data.starEvents, student.id, subjectId || null);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      className={cn(
                        "group relative overflow-hidden rounded-[1.5rem] border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-5",
                        active
                          ? "border-pink-300 bg-gradient-to-br from-pink-50 via-white to-violet-50 shadow-xl shadow-pink-500/20 ring-4 ring-pink-200"
                          : "border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/60 hover:border-violet-200"
                      )}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-200/25 blur-2xl transition group-hover:bg-amber-200/40" />
                      {active ? (
                        <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-pink-600 px-3 py-1.5 text-xs font-black text-white shadow-md">
                          <CheckCircle2 className="h-4 w-4" />
                          เลือกแล้ว
                        </div>
                      ) : null}
                      <div className="relative grid gap-4 sm:grid-cols-[132px_1fr] sm:items-center">
                        <div className="rounded-[1.35rem] bg-gradient-to-br from-violet-100 via-white to-amber-50 p-2 shadow-inner ring-1 ring-violet-100">
                          <StudentAvatar
                            name={student.full_name}
                            photoUrl={student.photo_url}
                            size="lg"
                            shape="rounded"
                            className="aspect-[4/3] h-28 w-full rounded-[1rem] border-2 border-white object-cover shadow-md sm:h-32"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className={cn("truncate text-3xl font-black leading-tight sm:pr-24", active ? "text-pink-950" : "text-violet-950")}>
                            {student.nickname}
                          </p>
                          <p className={cn("mt-2 line-clamp-2 text-sm font-bold leading-relaxed", active ? "text-pink-700" : "text-slate-500")}>
                            เลขที่ {student.student_number} <span className="px-1 text-violet-300">•</span> {student.full_name}
                          </p>
                          <div
                            className={cn(
                              "mt-4 flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm font-black shadow-inner sm:px-4",
                              active
                                ? "border-pink-100 bg-white/90 text-pink-700"
                                : "border-amber-100 bg-gradient-to-r from-amber-50 via-yellow-50 to-white text-amber-800"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-500 ring-1 ring-amber-200">
                                <Star className="h-4 w-4 fill-current" />
                              </span>
                              ดาวสะสม
                            </span>
                            <span className="flex items-center gap-2 text-2xl font-black text-orange-600">
                              {formatStars(totalStars)}
                              <Star className="h-6 w-6 fill-amber-400 text-amber-400 drop-shadow-sm" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                  })}
                </div>
              ) : (
                <div className="grid min-h-[260px] place-items-center rounded-[1.5rem] border-2 border-dashed border-violet-200 bg-violet-50/70 p-8 text-center">
                  <div>
                    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                    <h3 className="mt-3 text-2xl font-black text-violet-950">
                      {students.length === 0 ? "ยังไม่มีนักเรียนในห้องนี้" : "ไม่พบนักเรียนที่ค้นหา"}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {students.length === 0
                        ? "เพิ่มรายชื่อนักเรียนก่อนเริ่มให้ดาว"
                        : "ลองล้างคำค้นหา หรือค้นหาด้วยเลขที่ ชื่อจริง หรือชื่อเล่น"}
                    </p>
                  </div>
                </div>
              )}
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredGroups.map((group) => {
                  const active = selectedGroupId === group.id;
                  const memberCount = students.filter((student) => student.group_id === group.id).length;
                  const memberStars = students
                    .filter((student) => student.group_id === group.id)
                    .reduce((sum, student) => sum + sumStudentStars(data.starEvents, student.id, subjectId || null), 0);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg",
                        active
                          ? "border-pink-400 bg-gradient-to-br from-pink-100 via-fuchsia-50 to-violet-100 shadow-xl shadow-pink-500/20 ring-4 ring-pink-200"
                          : "border-violet-100 bg-white"
                      )}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      {active ? (
                        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-pink-600 px-2.5 py-1 text-xs font-black text-white shadow-md">
                          <CheckCircle2 className="h-4 w-4" />
                          เลือกแล้ว
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ backgroundColor: group.color }}>
                          <UsersRound className="h-6 w-6" />
                        </div>
                        <div className="pr-20">
                          <p className={cn("text-lg font-black", active ? "text-pink-950" : "text-violet-950")}>{group.name}</p>
                          <p className={cn("text-xs font-bold", active ? "text-pink-700" : "text-slate-500")}>สมาชิก {memberCount} คน</p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-black",
                          active ? "bg-white/90 text-pink-700 ring-1 ring-pink-200" : "bg-amber-50 text-amber-700"
                        )}
                      >
                        ดาวสมาชิกรวม
                        <span>{formatStars(memberStars)} ⭐</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] bg-white/95 p-5 text-violet-950 shadow-2xl">
            <div className="mb-4 rounded-2xl bg-violet-50 p-4">
              <p className="text-sm font-bold text-slate-500">ผู้รับดาว</p>
              <p className="text-3xl font-black">{selectedName ?? "ยังไม่ได้เลือก"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {targetMode === "group" && selectedGroup
                  ? `สมาชิกปัจจุบัน ${selectedGroupMembers.length} คนจะได้ดาวรายคน`
                  : selectedStudents.length > 0
                    ? `${selectedStudentPreview}${selectedStudents.length > 4 ? ` และอีก ${selectedStudents.length - 4} คน` : ""}`
                    : "เลือกได้หลายคนก่อนกดให้ดาว"}
              </p>
              {targetMode === "student" && selectedStudents.length > 1 ? (
                <p className="mt-2 rounded-xl bg-pink-50 px-3 py-2 text-xs font-black text-pink-700">
                  กดให้ดาว 1 ครั้ง ระบบจะบันทึกแยกให้นักเรียนทั้ง {selectedStudents.length} คน
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              {STAR_SETTINGS.map((setting) => (
                <Button
                  key={setting.reason}
                  variant={setting.tone === "green" ? "success" : setting.tone === "purple" || setting.tone === "pink" ? "primary" : setting.tone === "blue" ? "secondary" : "warning"}
                  onClick={() => void award(setting.reason, setting.stars)}
                  disabled={awardDisabled}
                >
                  <Star className="h-4 w-4" />
                  {setting.label} +{formatStars(setting.stars)}
                </Button>
              ))}
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-violet-100 bg-white p-4">
              <div>
                <Label>เหตุผลเพิ่มเติม</Label>
                <TextArea value={customReason} onChange={(event) => setCustomReason(event.target.value)} placeholder="เช่น ตอบคำถามพร้อมอธิบายวิธีคิด" />
              </div>
              <div>
                <Label>จำนวนดาว</Label>
                <TextInput type="number" min="0.5" step="0.5" value={customStars} onChange={(event) => setCustomStars(event.target.value)} />
              </div>
              <Button className="w-full" variant="warning" onClick={() => void awardCustom()} disabled={awardDisabled}>
                <Zap className="h-4 w-4" />
                ให้ดาวตามที่กำหนด
              </Button>
            </div>

            {toast ? (
              <p className={cn("mt-4 flex items-center justify-center gap-2 rounded-2xl p-3 text-center font-black", toast.includes("กรุณา") || toast.includes("ไม่สำเร็จ") || toast.includes("Error") ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                {!(toast.includes("กรุณา") || toast.includes("ไม่สำเร็จ") || toast.includes("Error")) ? <CheckCircle2 className="h-5 w-5" /> : null}
                {toast}
              </p>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
