"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown, Clock, ListChecks, RotateCcw, Search, Star, UsersRound } from "lucide-react";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextArea, TextInput } from "@/components/ui/fields";
import { PageCard } from "@/components/ui/page-card";
import { classroomGroups, classroomStudents, randomCountForStudent, topGroups, topStudents } from "@/lib/calculations";
import { playPointSound } from "@/lib/sound-effects";
import type { DataBundle, StarEvent } from "@/lib/types";
import { formatStars } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

const tabs = [
  { id: "room", label: "รายห้อง" },
  { id: "activity", label: "รายกิจกรรม" },
  { id: "group", label: "รายกลุ่ม" },
  { id: "student", label: "รายนักเรียน" },
  { id: "history", label: "ประวัติการให้ดาว" }
] as const;

const timeRanges = [
  { id: "all", label: "ทั้งหมด" },
  { id: "today", label: "วันนี้" },
  { id: "7days", label: "7 วันล่าสุด" },
  { id: "month", label: "เดือนนี้" }
] as const;

type TabId = (typeof tabs)[number]["id"];
type TimeRangeId = (typeof timeRanges)[number]["id"];

export default function ReportsPage() {
  const { data, addStarEvent } = useData();
  const [classroomId, setClassroomId] = useState(data.classrooms[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeId>("all");
  const [tab, setTab] = useState<TabId>("room");
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [expandedActivityRows, setExpandedActivityRows] = useState<Record<string, boolean>>({});
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyVisibleCount, setHistoryVisibleCount] = useState(20);
  const [correctionEvent, setCorrectionEvent] = useState<StarEvent | null>(null);
  const [correctionStars, setCorrectionStars] = useState("1");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState("");

  useEffect(() => {
    if (!classroomId && data.classrooms[0]?.id) {
      setClassroomId(data.classrooms[0].id);
    }
  }, [classroomId, data.classrooms]);

  const subjects = useMemo(() => data.subjects.filter((subject) => subject.classroom_id === classroomId), [data.subjects, classroomId]);
  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const groups = useMemo(() => classroomGroups(data.groups, classroomId), [data.groups, classroomId]);
  const classEvents = useMemo(
    () =>
      data.starEvents
        .filter((event) => event.classroom_id === classroomId)
        .filter((event) => !subjectId || event.subject_id === subjectId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [classroomId, data.starEvents, subjectId]
  );
  const activityNames = useMemo(() => Array.from(new Set(classEvents.map((event) => event.activity_name || "ไม่ระบุกิจกรรม"))).sort((a, b) => a.localeCompare(b, "th")), [classEvents]);

  useEffect(() => {
    if (activityFilter && !activityNames.includes(activityFilter)) {
      setActivityFilter("");
    }
  }, [activityFilter, activityNames]);

  const filteredEvents = useMemo(
    () =>
      classEvents
        .filter((event) => !activityFilter || (event.activity_name || "ไม่ระบุกิจกรรม") === activityFilter)
        .filter((event) => isEventInTimeRange(event, timeRange)),
    [activityFilter, classEvents, timeRange]
  );
  const reportData = useMemo<DataBundle>(() => ({ ...data, starEvents: filteredEvents }), [data, filteredEvents]);
  const rankedStudents = useMemo(() => topStudents(reportData, classroomId, null, 100), [classroomId, reportData]);
  const rankedGroups = useMemo(() => topGroups(reportData, classroomId, null, 100), [classroomId, reportData]);
  const roomStars = filteredEvents.filter((event) => event.event_type === "student").reduce((sum, event) => sum + Number(event.stars), 0);
  const groupStars = filteredEvents.filter((event) => event.event_type === "group").reduce((sum, event) => sum + Number(event.stars), 0);
  const randomCount = data.randomLogs.filter((log) => log.classroom_id === classroomId).filter((log) => !subjectId || log.subject_id === subjectId).length;
  const lowRandom = rankedStudents
    .map((row) => ({ ...row, count: randomCountForStudent(data, row.student.id) }))
    .sort((a, b) => a.count - b.count || a.student.student_number - b.student.student_number)
    .slice(0, 8);
  const activitySummaries = useMemo(() => buildActivitySummaries(filteredEvents), [filteredEvents]);
  const studentDetails = useMemo(
    () =>
      students
        .map((student) => {
          const events = filteredEvents.filter((event) => event.student_id === student.id);
          return {
            student,
            events,
            stars: events.reduce((sum, event) => sum + Number(event.stars), 0)
          };
        })
        .filter((row) => row.events.length > 0)
        .sort((a, b) => b.stars - a.stars || a.student.student_number - b.student.student_number),
    [filteredEvents, students]
  );
  const correctionRecipient = correctionEvent ? getRecipient(correctionEvent, data) : null;
  const historyEvents = useMemo(() => {
    const query = historyQuery.trim().toLocaleLowerCase("th-TH");
    if (!query) return filteredEvents;

    return filteredEvents.filter((event) => {
      const recipient = getRecipient(event, data);
      const subjectName = getSubjectName(data, event.subject_id);
      return [
        recipient.name,
        recipient.detail,
        recipient.typeLabel,
        event.activity_name || "ไม่ระบุกิจกรรม",
        event.reason || "",
        subjectName,
        formatDateTime(event.created_at)
      ]
        .join(" ")
        .toLocaleLowerCase("th-TH")
        .includes(query);
    });
  }, [data, filteredEvents, historyQuery]);
  const visibleHistoryEvents = historyEvents.slice(0, historyVisibleCount);

  useEffect(() => {
    setHistoryVisibleCount(20);
  }, [activityFilter, classroomId, historyQuery, subjectId, tab, timeRange]);

  function handleClassroomChange(nextClassroomId: string) {
    setClassroomId(nextClassroomId);
    setSubjectId("");
    setActivityFilter("");
  }

  function handleSubjectChange(nextSubjectId: string) {
    setSubjectId(nextSubjectId);
    setActivityFilter("");
  }

  function openCorrection(event: StarEvent) {
    setCorrectionEvent(event);
    setCorrectionStars(formatStars(Math.abs(Number(event.stars))));
    setCorrectionReason(`แก้ไขรายการให้ดาวผิด: ${event.reason || event.activity_name || "ไม่ระบุเหตุผล"}`);
    setCorrectionMessage("");
  }

  async function submitCorrection() {
    if (!correctionEvent || !correctionRecipient) return;

    const amount = Number(correctionStars);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCorrectionMessage("กรุณาใส่จำนวนดาวที่ต้องการปรับลดมากกว่า 0");
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันปรับลด ${formatStars(amount)} ดาวของ ${correctionRecipient.name} หรือไม่?\nระบบจะบันทึกเป็นประวัติใหม่ ไม่ลบรายการเดิม`
    );
    if (!confirmed) return;

    setCorrectionBusy(true);
    try {
      playPointSound();
      await addStarEvent({
        student_id: correctionEvent.student_id,
        group_id: correctionEvent.group_id,
        classroom_id: correctionEvent.classroom_id,
        subject_id: correctionEvent.subject_id,
        activity_name: `แก้ไข: ${correctionEvent.activity_name || "กิจกรรมในชั้นเรียน"}`,
        reason: correctionReason.trim() || `ปรับลดจากรายการที่ให้ไว้ ${formatStars(correctionEvent.stars)} ดาว`,
        stars: -Math.abs(amount),
        event_type: correctionEvent.event_type
      });
      setCorrectionMessage(`ปรับลด ${formatStars(amount)} ดาวของ ${correctionRecipient.name} แล้ว`);
      setCorrectionEvent(null);
      setCorrectionStars("1");
      setCorrectionReason("");
    } catch (caught) {
      setCorrectionMessage(caught instanceof Error ? caught.message : "ปรับลดดาวไม่สำเร็จ");
    } finally {
      setCorrectionBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-violet-600">รายงาน</p>
        <h1 className="text-3xl font-black text-violet-950">รายงานดาวและการสุ่ม</h1>
      </header>

      <PageCard>
        <div className="grid gap-3 xl:grid-cols-[190px_190px_220px_180px_1fr]">
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
            <SelectInput value={subjectId} onChange={(event) => handleSubjectChange(event.target.value)}>
              <option value="">ทุกวิชา</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div>
            <Label>กิจกรรม</Label>
            <SelectInput value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
              <option value="">ทุกกิจกรรม</option>
              {activityNames.map((activityName) => (
                <option key={activityName} value={activityName}>
                  {activityName}
                </option>
              ))}
            </SelectInput>
          </div>
          <div>
            <Label>ช่วงเวลา</Label>
            <SelectInput value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRangeId)}>
              {timeRanges.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {tabs.map((item) => (
              <Button key={item.id} variant={tab === item.id ? "primary" : "light"} onClick={() => setTab(item.id)}>
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </PageCard>

      {correctionEvent && correctionRecipient ? (
        <PageCard className="border-rose-200 bg-rose-50">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-rose-600">แก้ไขคะแนนดาว</p>
              <h2 className="text-xl font-black text-violet-950">ปรับลดดาวจากรายการที่กดผิด</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                รายการเดิม: {correctionRecipient.name} · {correctionEvent.activity_name || "ไม่ระบุกิจกรรม"} · {formatStars(correctionEvent.stars)} ดาว
              </p>
            </div>
            <Button variant="ghost" onClick={() => setCorrectionEvent(null)} disabled={correctionBusy}>
              ยกเลิก
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[180px_1fr_auto] lg:items-end">
            <div>
              <Label>จำนวนดาวที่ปรับลด</Label>
              <TextInput
                type="number"
                min="0.5"
                step="0.5"
                value={correctionStars}
                onChange={(event) => setCorrectionStars(event.target.value)}
                disabled={correctionBusy}
              />
            </div>
            <div>
              <Label>เหตุผลการปรับลด</Label>
              <TextArea
                className="min-h-11"
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
                disabled={correctionBusy}
              />
            </div>
            <Button variant="danger" onClick={() => void submitCorrection()} disabled={correctionBusy}>
              <RotateCcw className="h-4 w-4" />
              บันทึกปรับลด
            </Button>
          </div>
        </PageCard>
      ) : null}

      {correctionMessage ? (
        <p className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm font-bold text-violet-800">{correctionMessage}</p>
      ) : null}

      {tab === "room" ? (
        <section className="grid gap-4 md:grid-cols-3">
          <PageCard>
            <BarChart3 className="mb-3 h-8 w-8 text-violet-500" />
            <p className="text-sm font-bold text-slate-500">ดาวที่ลงรายนักเรียน</p>
            <p className="text-4xl font-black text-violet-950">{formatStars(roomStars)} ⭐</p>
          </PageCard>
          <PageCard>
            <UsersRound className="mb-3 h-8 w-8 text-sky-500" />
            <p className="text-sm font-bold text-slate-500">ดาวกลุ่มแบบเดิม</p>
            <p className="text-4xl font-black text-violet-950">{formatStars(groupStars)} ⭐</p>
          </PageCard>
          <PageCard>
            <Clock className="mb-3 h-8 w-8 text-amber-500" />
            <p className="text-sm font-bold text-slate-500">จำนวนครั้งที่สุ่ม</p>
            <p className="text-4xl font-black text-violet-950">{randomCount}</p>
          </PageCard>
        </section>
      ) : null}

      {tab === "activity" ? (
        <PageCard>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-violet-950">สรุปดาวรายกิจกรรม</h2>
              <p className="text-sm font-semibold text-slate-500">ดูว่าแต่ละกิจกรรมมีใครได้รับดาว จำนวนเท่าไหร่ และให้ด้วยเหตุผลอะไร</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 font-black text-amber-600">
              <Star className="h-4 w-4 fill-current" />
              {formatStars(roomStars + groupStars)} ดาว
            </div>
          </div>
          <div className="space-y-4">
            {activitySummaries.length === 0 ? <NoRows message="ยังไม่มีรายการให้ดาวตามตัวกรองนี้" /> : null}
            {activitySummaries.map((activity) => {
              const isExpanded = Boolean(expandedActivities[activity.name]);
              const showAllRows = Boolean(expandedActivityRows[activity.name]);
              const visibleEvents = showAllRows ? activity.events : activity.events.slice(0, 10);
              const topRecipients = summarizeActivityRecipients(activity.events, data).slice(0, 3);

              return (
                <section key={activity.name} className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm shadow-violet-900/5">
                  <button
                    type="button"
                    className="grid w-full gap-3 p-4 text-left transition hover:bg-violet-50/50 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center"
                    onClick={() => setExpandedActivities((current) => ({ ...current, [activity.name]: !current[activity.name] }))}
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <h3 className="text-lg font-black text-violet-950">{activity.name}</h3>
                      <p className="text-sm font-semibold text-slate-500">ล่าสุด {formatDateTime(activity.latestAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {topRecipients.map((recipient) => (
                          <span key={recipient.name} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                            {recipient.name} {formatStars(recipient.stars)} ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-sm font-black text-violet-700">{activity.events.length} รายการ</span>
                    <span className={`w-fit rounded-full px-3 py-1 text-sm font-black ${starBadgeClass(activity.totalStars)}`}>{formatStars(activity.totalStars)} ดาว</span>
                    <span className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-black text-violet-700 shadow-sm shadow-violet-900/10 ring-1 ring-violet-100">
                      {isExpanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                      <ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} />
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-violet-100 bg-violet-50/35 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-500">
                        <span>แสดง {visibleEvents.length} จาก {activity.events.length} รายการ</span>
                        {activity.events.length > 10 ? (
                          <Button
                            variant="light"
                            className="min-h-9 px-3 py-1 text-xs"
                            onClick={() => setExpandedActivityRows((current) => ({ ...current, [activity.name]: !current[activity.name] }))}
                          >
                            {showAllRows ? "แสดง 10 รายการแรก" : "แสดงทั้งหมด"}
                          </Button>
                        ) : null}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[840px] border-separate border-spacing-y-2 text-left text-sm">
                          <thead className="text-xs font-black text-slate-400">
                            <tr>
                              <th className="px-3">ผู้ได้รับดาว</th>
                              <th className="px-3">ประเภท</th>
                              <th className="px-3">เหตุผล</th>
                              <th className="px-3 text-right">ดาว</th>
                              <th className="px-3 text-right">วันที่</th>
                              <th className="px-3 text-right">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleEvents.map((event) => {
                              const recipient = getRecipient(event, data);
                              return (
                                <tr key={event.id} className="bg-white font-bold text-violet-950 shadow-sm shadow-violet-900/5">
                                  <td className="rounded-l-2xl px-3 py-3">
                                    <div className="flex items-center gap-3">
                                      {recipient.student ? <StudentAvatar name={recipient.student.full_name} photoUrl={recipient.student.photo_url} size="sm" /> : <ListChecks className="h-8 w-8 rounded-full bg-violet-50 p-1.5 text-violet-500" />}
                                      <div>
                                        <p className="font-black">{recipient.name}</p>
                                        <p className="text-xs font-semibold text-slate-500">{recipient.detail}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-slate-600">{recipient.typeLabel}</td>
                                  <td className="px-3 py-3 text-slate-600">{event.reason || "-"}</td>
                                  <td className={`px-3 py-3 text-right font-black ${starTextClass(event.stars)}`}>{formatStars(event.stars)} ⭐</td>
                                  <td className="px-3 py-3 text-right text-xs text-slate-500">{formatDateTime(event.created_at)}</td>
                                  <td className="rounded-r-2xl px-3 py-3 text-right">
                                    {canCorrectEvent(event) ? (
                                      <Button variant="light" className="min-h-8 px-3 py-1 text-xs" onClick={() => openCorrection(event)}>
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        ปรับลด
                                      </Button>
                                    ) : (
                                      <span className="text-xs font-bold text-slate-300">รายการปรับลด</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </PageCard>
      ) : null}

      {tab === "group" ? (
        <PageCard>
          <h2 className="mb-1 text-xl font-black text-violet-950">อันดับกลุ่มจากดาวสมาชิก</h2>
          <p className="mb-4 text-sm font-semibold text-slate-500">คำนวณจากดาวของสมาชิกปัจจุบันในแต่ละกลุ่ม</p>
          <div className="space-y-2">
            {rankedGroups.length === 0 ? <NoRows message="ยังไม่มีกลุ่มในห้องนี้" /> : null}
            {rankedGroups.map(({ group, stars }, index) => (
              <div key={group.id} className="flex items-center justify-between rounded-2xl bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 font-black text-violet-700">{index + 1}</span>
                  <span className="font-black text-violet-950">{group.name}</span>
                </div>
                <span className="font-black text-amber-500">{formatStars(stars)} ⭐</span>
              </div>
            ))}
          </div>
        </PageCard>
      ) : null}

      {tab === "student" ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <PageCard>
            <h2 className="mb-4 text-xl font-black text-violet-950">อันดับดาวรายคน</h2>
            <div className="space-y-2">
              {rankedStudents.length === 0 ? <NoRows message="ยังไม่มีนักเรียนในห้องนี้" /> : null}
              {rankedStudents.map(({ student, stars }, index) => (
                <div key={student.id} className="flex items-center justify-between rounded-2xl bg-white p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 font-black text-amber-700">{index + 1}</span>
                    <StudentAvatar name={student.full_name} photoUrl={student.photo_url} size="sm" />
                    <div>
                      <p className="font-black text-violet-950">{student.full_name}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        ชื่อเล่น {student.nickname} · เลขที่ {student.student_number}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-amber-500">{formatStars(stars)} ⭐</span>
                </div>
              ))}
            </div>
          </PageCard>
          <PageCard>
            <h2 className="mb-4 text-xl font-black text-violet-950">นักเรียนที่ยังไม่ค่อยถูกสุ่ม</h2>
            <div className="space-y-2">
              {lowRandom.length === 0 ? <NoRows message="ยังไม่มีข้อมูลการสุ่ม" /> : null}
              {lowRandom.map(({ student, count }) => (
                <div key={student.id} className="flex items-center justify-between rounded-2xl bg-white p-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={student.full_name} photoUrl={student.photo_url} size="sm" />
                    <div>
                      <p className="font-black text-violet-950">{student.full_name}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        ชื่อเล่น {student.nickname} · เลขที่ {student.student_number}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-sky-600">{count} ครั้ง</span>
                </div>
              ))}
            </div>
          </PageCard>
          <PageCard className="xl:col-span-2">
            <h2 className="mb-1 text-xl font-black text-violet-950">รายละเอียดดาวรายนักเรียน</h2>
            <p className="mb-4 text-sm font-semibold text-slate-500">เปิดดูได้ว่านักเรียนแต่ละคนได้ดาวจากกิจกรรมชื่ออะไร พร้อมเหตุผลและวันที่</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {studentDetails.length === 0 ? <NoRows message="ยังไม่มีนักเรียนที่ได้รับดาวตามตัวกรองนี้" /> : null}
              {studentDetails.map(({ student, events, stars }) => (
                <section key={student.id} className="rounded-2xl border border-violet-100 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={student.full_name} photoUrl={student.photo_url} size="sm" />
                      <div>
                        <h3 className="font-black text-violet-950">{student.full_name}</h3>
                        <p className="text-xs font-semibold text-slate-500">
                          ชื่อเล่น {student.nickname} · เลขที่ {student.student_number}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${starBadgeClass(stars)}`}>{formatStars(stars)} ดาว</span>
                  </div>
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div key={event.id} className="grid gap-2 rounded-2xl bg-violet-50/70 p-3 sm:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-black text-violet-950">{event.activity_name || "ไม่ระบุกิจกรรม"}</p>
                          <p className="text-sm font-semibold text-slate-500">{event.reason || "ไม่มีเหตุผลกำกับ"}</p>
                          <p className="text-xs font-bold text-slate-400">
                            {getSubjectName(data, event.subject_id)} · {formatDateTime(event.created_at)}
                          </p>
                        </div>
                        <span className={`font-black ${starTextClass(event.stars)}`}>{formatStars(event.stars)} ⭐</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </PageCard>
        </section>
      ) : null}

      {tab === "history" ? (
        <PageCard>
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h2 className="text-xl font-black text-violet-950">ประวัติการให้ดาวล่าสุด</h2>
              <p className="text-sm font-semibold text-slate-500">
                แสดงแบบ timeline เพื่อไล่ตรวจรายการล่าสุด ค้นหาได้จากชื่อ นักเรียน กิจกรรม เหตุผล หรือรายวิชา
              </p>
            </div>
            <div>
              <Label>ค้นหาประวัติ</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  className="pl-9"
                  placeholder="พิมพ์ชื่อเล่น ชื่อจริง กิจกรรม หรือเหตุผล"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {historyEvents.length === 0 ? <NoRows message="ยังไม่มีประวัติการให้ดาวตามตัวกรองนี้" /> : null}
            {visibleHistoryEvents.map((event) => {
              const recipient = getRecipient(event, data);
              return (
                <div key={event.id} className="grid gap-2 rounded-2xl bg-white p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <div className="flex items-center gap-3">
                    {recipient.student ? <StudentAvatar name={recipient.student.full_name} photoUrl={recipient.student.photo_url} size="sm" /> : <ListChecks className="h-8 w-8 rounded-full bg-violet-50 p-1.5 text-violet-500" />}
                    <div>
                      <p className="font-black text-violet-950">{recipient.name}</p>
                      <p className="text-sm font-semibold text-slate-500">
                        {recipient.detail} · {event.activity_name || "ไม่ระบุกิจกรรม"} · {event.reason || "ไม่มีเหตุผลกำกับ"} · {getSubjectName(data, event.subject_id)}
                      </p>
                    </div>
                  </div>
                  <span className={`font-black ${starTextClass(event.stars)}`}>{formatStars(event.stars)} ⭐</span>
                  <span className="text-xs font-bold text-slate-400">{formatDateTime(event.created_at)}</span>
                  {canCorrectEvent(event) ? (
                    <Button variant="light" className="min-h-8 px-3 py-1 text-xs" onClick={() => openCorrection(event)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      ปรับลด
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-slate-300 md:text-right">รายการปรับลด</span>
                  )}
                </div>
              );
            })}
          </div>
          {historyEvents.length > visibleHistoryEvents.length ? (
            <div className="mt-4 flex justify-center">
              <Button variant="light" onClick={() => setHistoryVisibleCount((count) => count + 20)}>
                โหลดเพิ่มอีก {Math.min(20, historyEvents.length - visibleHistoryEvents.length)} รายการ
              </Button>
            </div>
          ) : historyEvents.length > 0 ? (
            <p className="mt-4 text-center text-sm font-bold text-slate-400">แสดงครบ {historyEvents.length} รายการแล้ว</p>
          ) : null}
        </PageCard>
      ) : null}
    </div>
  );
}

function canCorrectEvent(event: StarEvent) {
  return Number(event.stars) > 0 && Boolean(event.student_id || event.group_id);
}

function isEventInTimeRange(event: StarEvent, range: TimeRangeId) {
  if (range === "all") return true;

  const eventDate = new Date(event.created_at);
  const now = new Date();

  if (range === "today") {
    return eventDate.toDateString() === now.toDateString();
  }

  if (range === "7days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return eventDate >= start;
  }

  if (range === "month") {
    return eventDate.getFullYear() === now.getFullYear() && eventDate.getMonth() === now.getMonth();
  }

  return true;
}

function starTextClass(stars: number) {
  return Number(stars) < 0 ? "text-rose-600" : "text-amber-500";
}

function starBadgeClass(stars: number) {
  return Number(stars) < 0 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600";
}

function buildActivitySummaries(events: StarEvent[]) {
  const summaries = new Map<string, { name: string; totalStars: number; latestAt: string; events: StarEvent[] }>();

  for (const event of events) {
    const name = event.activity_name || "ไม่ระบุกิจกรรม";
    const existing = summaries.get(name);
    if (existing) {
      existing.events.push(event);
      existing.totalStars += Number(event.stars);
      if (new Date(event.created_at).getTime() > new Date(existing.latestAt).getTime()) {
        existing.latestAt = event.created_at;
      }
    } else {
      summaries.set(name, {
        name,
        totalStars: Number(event.stars),
        latestAt: event.created_at,
        events: [event]
      });
    }
  }

  return Array.from(summaries.values()).sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

function summarizeActivityRecipients(events: StarEvent[], data: DataBundle) {
  const summaries = new Map<string, { name: string; stars: number }>();

  for (const event of events) {
    const recipient = getRecipient(event, data);
    const existing = summaries.get(recipient.name);
    if (existing) {
      existing.stars += Number(event.stars);
    } else {
      summaries.set(recipient.name, { name: recipient.name, stars: Number(event.stars) });
    }
  }

  return Array.from(summaries.values()).sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name, "th"));
}

function getRecipient(event: StarEvent, data: DataBundle) {
  const student = event.student_id ? data.students.find((item) => item.id === event.student_id) ?? null : null;
  if (student) {
    return {
      name: student.full_name,
      detail: `ชื่อเล่น ${student.nickname} · เลขที่ ${student.student_number}`,
      typeLabel: "นักเรียน",
      student
    };
  }

  const group = event.group_id ? data.groups.find((item) => item.id === event.group_id) ?? null : null;
  if (group) {
    return {
      name: group.name,
      detail: "ให้ดาวทั้งกลุ่ม",
      typeLabel: "กลุ่ม",
      student: null
    };
  }

  return {
    name: "รายการดาว",
    detail: "ไม่พบผู้รับดาว",
    typeLabel: "-",
    student: null
  };
}

function getSubjectName(data: DataBundle, subjectId: string | null) {
  if (!subjectId) return "ไม่ระบุวิชา";
  return data.subjects.find((subject) => subject.id === subjectId)?.name ?? "ไม่ระบุวิชา";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function NoRows({ message }: { message: string }) {
  return <p className="rounded-2xl bg-white p-4 text-center font-bold text-slate-500">{message}</p>;
}
