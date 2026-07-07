"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Trash2, UserMinus, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { GroupIcon } from "@/components/admin/group-icon";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextInput } from "@/components/ui/fields";
import { PageCard } from "@/components/ui/page-card";
import { classroomGroups, classroomStudents, sumStudentStars } from "@/lib/calculations";
import { readTeachingSession, saveTeachingSession } from "@/lib/teaching-session";
import type { Group, GroupDraft } from "@/lib/types";
import { formatStars } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

function selectedClassroomFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("classroom");
}

function createDraft(classroomId: string): GroupDraft {
  return {
    classroom_id: classroomId,
    name: "",
    color: "#38bdf8",
    icon_url: null
  };
}

export default function GroupsPage() {
  const { data, addGroup, updateGroup, deleteGroup, assignStudentToGroup } = useData();
  const firstClassroomId = data.classrooms[0]?.id ?? "";
  const [classroomId, setClassroomId] = useState("");
  const [draft, setDraft] = useState<GroupDraft>(createDraft(firstClassroomId));
  const [editing, setEditing] = useState<Group | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => classroomGroups(data.groups, classroomId), [data.groups, classroomId]);
  const students = useMemo(() => classroomStudents(data.students, classroomId), [data.students, classroomId]);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;
  const ungrouped = students.filter((student) => !student.group_id);
  const members = selectedGroup ? students.filter((student) => student.group_id === selectedGroup.id) : [];

  useEffect(() => {
    const queryClassroom = selectedClassroomFromUrl();
    const saved = readTeachingSession();
    const savedClassroomId = saved?.classroomId ?? "";
    const next =
      (queryClassroom && data.classrooms.some((classroom) => classroom.id === queryClassroom) ? queryClassroom : "") ||
      (savedClassroomId && data.classrooms.some((classroom) => classroom.id === savedClassroomId) ? savedClassroomId : "") ||
      firstClassroomId;
    if (next && !classroomId) {
      setClassroomId(next);
      setDraft(createDraft(next));
    }
  }, [classroomId, data.classrooms, firstClassroomId]);

  useEffect(() => {
    if (!selectedGroupId && groups[0]) setSelectedGroupId(groups[0].id);
    if (selectedGroupId && !groups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(groups[0]?.id ?? "");
  }, [groups, selectedGroupId]);

  function changeClassroom(next: string) {
    setClassroomId(next);
    setDraft(createDraft(next));
    setEditing(null);
    setSelectedGroupId("");
    const saved = readTeachingSession();
    saveTeachingSession({
      classroomId: next,
      subjectId: "",
      activity: saved?.activity || "โจทย์ดาวนักคิด",
      repeatMode: saved?.repeatMode ?? "unique"
    });
  }

  function startEdit(group: Group) {
    setEditing(group);
    setDraft({
      classroom_id: group.classroom_id,
      name: group.name,
      color: group.color,
      icon_url: group.icon_url
    });
    setIconFile(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateGroup(editing.id, draft, iconFile);
      } else {
        await addGroup(draft, iconFile);
      }
      setDraft(createDraft(classroomId));
      setEditing(null);
      setIconFile(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(group: Group) {
    const count = students.filter((student) => student.group_id === group.id).length;
    if (!confirm(`ลบกลุ่ม ${group.name} หรือไม่? สมาชิก ${count} คนจะถูกถอดออกจากกลุ่ม`)) return;
    await deleteGroup(group.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-violet-600">จัดการข้อมูลหลัก</p>
        <h1 className="text-3xl font-black text-violet-950">หน้าจัดการกลุ่ม</h1>
      </header>

      <PageCard>
        <div className="max-w-xs">
          <Label>ห้องเรียน</Label>
          <SelectInput value={classroomId} onChange={(event) => changeClassroom(event.target.value)}>
            {data.classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </PageCard>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <PageCard>
          <h2 className="mb-4 text-xl font-black text-violet-950">{editing ? "แก้ไขกลุ่ม" : "เพิ่มกลุ่ม"}</h2>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div>
              <Label>ชื่อกลุ่ม</Label>
              <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="เช่น ดาวเหนือ" />
            </div>
            <div>
              <Label>สีประจำกลุ่ม</Label>
              <TextInput type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} className="h-12 p-1" />
            </div>
            <div>
              <Label>ไอคอนกลุ่ม</Label>
              <TextInput type="file" accept="image/*" onChange={(event) => setIconFile(event.target.files?.[0] ?? null)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !classroomId}>
                {editing ? "บันทึกกลุ่ม" : "+ เพิ่มกลุ่ม"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setDraft(createDraft(classroomId));
                  }}
                >
                  ยกเลิก
                </Button>
              ) : null}
            </div>
          </form>
        </PageCard>

        <PageCard>
          {groups.length === 0 ? (
            <EmptyState title="ยังไม่มีกลุ่มในห้องนี้" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {groups.map((group) => {
                const groupMembers = students.filter((student) => student.group_id === group.id);
                const memberCount = groupMembers.length;
                const memberStars = groupMembers.reduce((sum, student) => sum + sumStudentStars(data.starEvents, student.id), 0);
                return (
                  <div
                    key={group.id}
                    role="button"
                    tabIndex={0}
                    className="soft-card rounded-2xl p-4 text-left transition hover:-translate-y-1"
                    onClick={() => setSelectedGroupId(group.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedGroupId(group.id);
                    }}
                  >
                    <GroupIcon name={group.name} color={group.color} iconUrl={group.icon_url} />
                    <p className="mt-3 text-lg font-black text-violet-950">{group.name}</p>
                    <p className="text-sm font-semibold text-slate-500">สมาชิก {memberCount} คน</p>
                    <p className="font-black text-amber-500">ดาวสมาชิกรวม {formatStars(memberStars)} ⭐</p>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="light" onClick={(event) => { event.stopPropagation(); startEdit(group); }}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="danger" onClick={(event) => { event.stopPropagation(); void handleDelete(group); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>
      </section>

      <PageCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-violet-950">จัดสมาชิกกลุ่ม</h2>
            <p className="text-sm font-semibold text-slate-500">เพิ่ม ถอด หรือย้ายนักเรียนระหว่างกลุ่ม</p>
          </div>
          <div className="w-full max-w-xs">
            <Label>เลือกกลุ่ม</Label>
            <SelectInput value={selectedGroup?.id ?? ""} onChange={(event) => setSelectedGroupId(event.target.value)}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        {!selectedGroup ? (
          <EmptyState title="เลือกหรือสร้างกลุ่มก่อน" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <h3 className="mb-3 font-black text-violet-950">ยังไม่มีกลุ่ม</h3>
              <div className="space-y-2">
                {ungrouped.length === 0 ? <p className="text-sm font-semibold text-slate-500">ไม่มีนักเรียนรอจัดกลุ่ม</p> : null}
                {ungrouped.map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-2">
                    <div className="flex items-center gap-2">
                      <StudentAvatar name={student.full_name} photoUrl={student.photo_url} size="sm" />
                      <span className="font-bold">{student.nickname}</span>
                    </div>
                    <Button variant="success" onClick={() => void assignStudentToGroup(student.id, selectedGroup.id)}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <h3 className="mb-3 font-black text-violet-950">สมาชิก {selectedGroup.name}</h3>
              <div className="space-y-2">
                {members.length === 0 ? <p className="text-sm font-semibold text-slate-500">ยังไม่มีสมาชิกในกลุ่มนี้</p> : null}
                {members.map((student) => (
                  <div key={student.id} className="flex flex-col gap-2 rounded-xl bg-violet-50 p-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <StudentAvatar name={student.full_name} photoUrl={student.photo_url} size="sm" />
                      <span className="font-bold">{student.nickname}</span>
                    </div>
                    <div className="flex gap-2">
                      <SelectInput className="min-h-10" value={student.group_id ?? ""} onChange={(event) => void assignStudentToGroup(student.id, event.target.value || null)}>
                        <option value="">ไม่มีกลุ่ม</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </SelectInput>
                      <Button variant="danger" onClick={() => void assignStudentToGroup(student.id, null)}>
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </PageCard>
    </div>
  );
}
