"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Edit3, Trash2, Users, UsersRound, X } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextInput } from "@/components/ui/fields";
import { PageCard } from "@/components/ui/page-card";
import type { Classroom, ClassroomDraft } from "@/lib/types";
import { useData } from "@/components/providers/data-provider";

const initialDraft: ClassroomDraft = {
  name: "",
  grade_level: "ป.4",
  academic_year: "2569",
  status: "active"
};

export default function ClassroomsPage() {
  const { data, addClassroom, updateClassroom, deleteClassroom } = useData();
  const [draft, setDraft] = useState<ClassroomDraft>(initialDraft);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateClassroom(editing.id, draft);
      } else {
        await addClassroom(draft);
      }
      setDraft(initialDraft);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(classroom: Classroom) {
    setEditing(classroom);
    setDraft({
      name: classroom.name,
      grade_level: classroom.grade_level,
      academic_year: classroom.academic_year,
      status: classroom.status
    });
  }

  async function handleDelete(classroom: Classroom) {
    const studentCount = data.students.filter((student) => student.classroom_id === classroom.id).length;
    if (!confirm(`ลบห้อง ${classroom.name} และข้อมูลที่เกี่ยวข้องหรือไม่? มีนักเรียน ${studentCount} คน`)) return;
    await deleteClassroom(classroom.id);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(initialDraft);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-violet-600">จัดการข้อมูลหลัก</p>
        <h1 className="text-3xl font-black text-violet-950">หน้าจัดการห้องเรียน</h1>
      </header>

      <PageCard>
        <form className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]" onSubmit={onSubmit}>
          <div>
            <Label>ชื่อห้องเรียน</Label>
            <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="เช่น ป.4/1" />
          </div>
          <div>
            <Label>ระดับชั้น</Label>
            <TextInput value={draft.grade_level} onChange={(event) => setDraft({ ...draft, grade_level: event.target.value })} placeholder="ป.4" />
          </div>
          <div>
            <Label>ปีการศึกษา</Label>
            <TextInput value={draft.academic_year} onChange={(event) => setDraft({ ...draft, academic_year: event.target.value })} placeholder="2569" />
          </div>
          <div>
            <Label>สถานะ</Label>
            <SelectInput value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ClassroomDraft["status"] })}>
              <option value="active">เปิดใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </SelectInput>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={saving}>
              {editing ? "บันทึก" : "+ เพิ่มห้องเรียน"}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setDraft(initialDraft);
                }}
              >
                ยกเลิก
              </Button>
            ) : null}
          </div>
        </form>
      </PageCard>

      <PageCard>
        {data.classrooms.length === 0 ? (
          <EmptyState title="ยังไม่มีห้องเรียน" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
              <thead className="text-sm text-slate-500">
                <tr>
                  <th className="px-3 py-2">ชื่อห้องเรียน</th>
                  <th className="px-3 py-2">ระดับชั้น</th>
                  <th className="px-3 py-2">ปีการศึกษา</th>
                  <th className="px-3 py-2">นักเรียน</th>
                  <th className="px-3 py-2">สถานะ</th>
                  <th className="px-3 py-2 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.classrooms.map((classroom) => {
                  const studentCount = data.students.filter((student) => student.classroom_id === classroom.id).length;
                  return (
                    <tr key={classroom.id} className="rounded-2xl bg-white shadow-sm">
                      <td className="rounded-l-2xl px-3 py-4 text-lg font-black text-violet-950">{classroom.name}</td>
                      <td className="px-3 py-4 font-semibold">{classroom.grade_level}</td>
                      <td className="px-3 py-4 font-semibold">{classroom.academic_year}</td>
                      <td className="px-3 py-4 font-semibold">{studentCount} คน</td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
                          {classroom.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </td>
                      <td className="rounded-r-2xl px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/students?classroom=${classroom.id}`}>
                            <Button variant="light" title={`จัดการนักเรียนห้อง ${classroom.name}`}>
                              <Users className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/groups?classroom=${classroom.id}`}>
                            <Button variant="light" title={`จัดกลุ่มห้อง ${classroom.name}`}>
                              <UsersRound className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button type="button" variant="light" title={`แก้ไขห้อง ${classroom.name}`} onClick={() => startEdit(classroom)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="danger" title={`ลบห้อง ${classroom.name}`} onClick={() => void handleDelete(classroom)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-violet-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-2xl rounded-[1.75rem] bg-white p-6 shadow-2xl shadow-violet-950/25 ring-1 ring-violet-100"
            onSubmit={onSubmit}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-violet-600">แก้ไขข้อมูลห้องเรียน</p>
                <h2 className="text-2xl font-black text-violet-950">แก้ไขชื่อห้องเรียน</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">ปรับชื่อ ระดับชั้น ปีการศึกษา หรือสถานะของห้องนี้</p>
              </div>
              <Button type="button" variant="light" className="h-11 w-11 px-0" title="ปิดหน้าต่างแก้ไข" onClick={cancelEdit}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>ชื่อห้องเรียน</Label>
                <TextInput
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="เช่น ป.4/1"
                  autoFocus
                />
              </div>
              <div>
                <Label>ระดับชั้น</Label>
                <TextInput value={draft.grade_level} onChange={(event) => setDraft({ ...draft, grade_level: event.target.value })} placeholder="ป.4" />
              </div>
              <div>
                <Label>ปีการศึกษา</Label>
                <TextInput
                  value={draft.academic_year}
                  onChange={(event) => setDraft({ ...draft, academic_year: event.target.value })}
                  placeholder="2569"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>สถานะ</Label>
                <SelectInput value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ClassroomDraft["status"] })}>
                  <option value="active">เปิดใช้งาน</option>
                  <option value="inactive">ปิดใช้งาน</option>
                </SelectInput>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={cancelEdit}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                บันทึกการแก้ไข
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
