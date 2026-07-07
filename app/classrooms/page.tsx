"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Edit3, ImagePlus, Rocket, Trash2, Upload, Users, UsersRound, X } from "lucide-react";
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
  image_url: null,
  sort_order: 0,
  status: "active"
};

export default function ClassroomsPage() {
  const { data, addClassroom, updateClassroom, reorderClassrooms, deleteClassroom } = useData();
  const [draft, setDraft] = useState<ClassroomDraft>(initialDraft);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [reorderBusyId, setReorderBusyId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [imageFile]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setFormError("");
    setSaving(true);
    try {
      if (editing) {
        await updateClassroom(editing.id, draft, imageFile);
      } else {
        await addClassroom(draft, imageFile);
      }
      setDraft(initialDraft);
      setEditing(null);
      setImageFile(null);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "บันทึกข้อมูลห้องเรียนไม่สำเร็จ");
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
      image_url: classroom.image_url,
      sort_order: classroom.sort_order,
      status: classroom.status
    });
    setImageFile(null);
    setFormError("");
  }

  async function handleDelete(classroom: Classroom) {
    const studentCount = data.students.filter((student) => student.classroom_id === classroom.id).length;
    if (!confirm(`ลบห้อง ${classroom.name} และข้อมูลที่เกี่ยวข้องหรือไม่? มีนักเรียน ${studentCount} คน`)) return;
    await deleteClassroom(classroom.id);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(initialDraft);
    setImageFile(null);
    setFormError("");
  }

  function handleImageFile(file: File | null) {
    if (!file) return;
    setFormError("");
    setImageFile(file);
  }

  function clearImage() {
    setImageFile(null);
    setDraft((current) => ({ ...current, image_url: null }));
  }

  const previewUrl = imagePreviewUrl ?? draft.image_url ?? null;

  async function moveClassroom(classroomId: string, direction: "up" | "down") {
    const currentIndex = data.classrooms.findIndex((classroom) => classroom.id === classroomId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= data.classrooms.length) return;

    const nextIds = data.classrooms.map((classroom) => classroom.id);
    [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

    setOrderError("");
    setReorderBusyId(classroomId);
    try {
      await reorderClassrooms(nextIds);
    } catch (caught) {
      setOrderError(caught instanceof Error ? caught.message : "จัดลำดับห้องเรียนไม่สำเร็จ");
    } finally {
      setReorderBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-violet-600">จัดการข้อมูลหลัก</p>
        <h1 className="text-3xl font-black text-violet-950">หน้าจัดการห้องเรียน</h1>
      </header>

      <PageCard>
        <form className="grid gap-5 xl:grid-cols-[240px_1fr]" onSubmit={onSubmit}>
          <ClassroomImagePicker
            previewUrl={previewUrl}
            onFile={handleImageFile}
            onClear={clearImage}
            disabled={saving}
          />
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
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
                {saving ? "กำลังบันทึก..." : editing ? "บันทึก" : "+ เพิ่มห้องเรียน"}
              </Button>
              {editing ? (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  ยกเลิก
                </Button>
              ) : null}
            </div>
            {formError ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 md:col-span-5">{formError}</p>
            ) : null}
          </div>
        </form>
      </PageCard>

      <PageCard>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-violet-950">ลำดับห้องเรียน</h2>
            <p className="text-sm font-semibold text-slate-500">กดลูกศรเพื่อจัดว่าห้องไหนแสดงบน Dashboard ก่อน</p>
          </div>
          <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 ring-1 ring-violet-100">
            ห้องบนสุดจะแสดงก่อน
          </span>
        </div>
        {orderError ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">{orderError}</p> : null}
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
                  const classroomIndex = data.classrooms.findIndex((item) => item.id === classroom.id);
                  return (
                    <tr key={classroom.id} className="rounded-2xl bg-white shadow-sm">
                      <td className="rounded-l-2xl px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid gap-1">
                            <Button
                              type="button"
                              variant="light"
                              className="h-8 w-8 px-0"
                              title={`เลื่อน ${classroom.name} ขึ้น`}
                              disabled={classroomIndex === 0 || reorderBusyId === classroom.id}
                              onClick={() => void moveClassroom(classroom.id, "up")}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="light"
                              className="h-8 w-8 px-0"
                              title={`เลื่อน ${classroom.name} ลง`}
                              disabled={classroomIndex === data.classrooms.length - 1 || reorderBusyId === classroom.id}
                              onClick={() => void moveClassroom(classroom.id, "down")}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                          <ClassroomThumb classroom={classroom} />
                          <div>
                            <span className="text-lg font-black text-violet-950">{classroom.name}</span>
                            <p className="text-xs font-bold text-slate-400">ลำดับที่ {classroomIndex + 1}</p>
                          </div>
                        </div>
                      </td>
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
                <p className="mt-1 text-sm font-semibold text-slate-500">ปรับชื่อ ระดับชั้น ปีการศึกษา สถานะ หรือภาพประจำห้องนี้</p>
              </div>
              <Button type="button" variant="light" className="h-11 w-11 px-0" title="ปิดหน้าต่างแก้ไข" onClick={cancelEdit}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <ClassroomImagePicker
                previewUrl={previewUrl}
                onFile={handleImageFile}
                onClear={clearImage}
                disabled={saving}
              />
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
              {formError ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 sm:col-span-2">{formError}</p>
              ) : null}
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

function ClassroomImagePicker({
  previewUrl,
  onFile,
  onClear,
  disabled
}: {
  previewUrl: string | null;
  onFile: (file: File | null) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>ภาพประจำห้อง</Label>
      <div className="rounded-[1.35rem] border border-violet-100 bg-violet-50/70 p-3 shadow-inner">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-dashed border-violet-200 bg-white">
          {previewUrl ? (
            <img src={previewUrl} alt="ภาพประจำห้อง" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-violet-50 via-white to-amber-50 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-600">
                  <Rocket className="h-7 w-7" />
                </span>
                <p className="mt-2 text-sm font-black text-violet-900">เพิ่มภาพห้องเรียน</p>
                <p className="text-xs font-bold text-slate-500">JPG, PNG, WEBP ไม่เกิน 5MB</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700">
            {previewUrl ? <ImagePlus className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {previewUrl ? "เปลี่ยนภาพ" : "อัปโหลดภาพ"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={disabled}
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {previewUrl ? (
            <Button type="button" variant="light" className="min-h-10 px-3 text-sm" onClick={onClear} disabled={disabled}>
              <Trash2 className="h-4 w-4" />
              ลบภาพ
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ClassroomThumb({ classroom }: { classroom: Classroom }) {
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-violet-100 bg-violet-50 text-violet-600 shadow-sm">
      {classroom.image_url ? (
        <img src={classroom.image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Rocket className="h-6 w-6" />
      )}
    </span>
  );
}
