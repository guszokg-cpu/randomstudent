"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Edit3, FileSpreadsheet, ImagePlus, Lock, Shuffle, Trash2, Upload, UserPlus, X } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { StudentAvatar } from "@/components/admin/student-avatar";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextArea, TextInput } from "@/components/ui/fields";
import { PageCard } from "@/components/ui/page-card";
import { classroomAllStudents, primaryStudentPhoto, studentGroup, studentPhotoGallery, sumStudentStars } from "@/lib/calculations";
import { downloadStudentExcelTemplate, parseStudentExcelFile } from "@/lib/student-excel";
import { readTeachingSession, saveTeachingSession } from "@/lib/teaching-session";
import type { StudentImportResult } from "@/lib/student-import";
import type { Student, StudentDraft, StudentPhoto } from "@/lib/types";
import { formatStars } from "@/lib/utils";
import { useData } from "@/components/providers/data-provider";

const maxPhotosPerStudent = 5;
type StudentStatusFilter = "all" | "active" | "inactive";

function selectedClassroomFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("classroom");
}

function createDraft(classroomId: string): StudentDraft {
  return {
    student_code: "",
    student_number: 1,
    full_name: "",
    nickname: "",
    classroom_id: classroomId,
    group_id: null,
    profile_photo_mode: "random",
    status: "active"
  };
}

export default function StudentsPage() {
  const {
    data,
    addStudent,
    updateStudent,
    addStudentPhotos,
    deleteStudentPhoto,
    setPrimaryStudentPhoto,
    deleteStudent,
    importStudents,
    importStudentRows
  } = useData();
  const firstClassroomId = data.classrooms[0]?.id ?? "";
  const [classroomId, setClassroomId] = useState("");
  const [draft, setDraft] = useState<StudentDraft>(createDraft(firstClassroomId));
  const [editing, setEditing] = useState<Student | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [importText, setImportText] = useState("1 เด็กชายก้อง\n2 เด็กหญิงแพรว");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("all");
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [excelBusy, setExcelBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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
    if (photoFiles.length === 0) {
      setPhotoPreviewUrls([]);
      return;
    }

    const nextUrls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviewUrls(nextUrls);
    return () => nextUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [photoFiles]);

  const groups = useMemo(() => data.groups.filter((group) => group.classroom_id === classroomId), [data.groups, classroomId]);
  const classroomStudentRows = useMemo(() => classroomAllStudents(data.students, classroomId), [data.students, classroomId]);
  const activeStudentCount = classroomStudentRows.filter((student) => student.status === "active").length;
  const inactiveStudentCount = classroomStudentRows.length - activeStudentCount;
  const students = useMemo(
    () => classroomStudentRows.filter((student) => statusFilter === "all" || student.status === statusFilter),
    [classroomStudentRows, statusFilter]
  );
  const selectedClassroom = data.classrooms.find((classroom) => classroom.id === classroomId);
  const editingPhotos = useMemo(() => (editing ? studentPhotoGallery(data.studentPhotos, editing) : []), [data.studentPhotos, editing]);
  const mainPhotoPreview = editing ? primaryStudentPhoto(data.studentPhotos, editing) : photoPreviewUrls[0] ?? null;
  const usedPhotoSlots = editingPhotos.length + photoFiles.length;
  const photoSlots = Array.from({ length: maxPhotosPerStudent }, (_, slotIndex) => {
    const existingPhoto = editingPhotos[slotIndex] ?? null;
    const pendingIndex = slotIndex - editingPhotos.length;
    return {
      slotIndex,
      existingPhoto,
      pendingIndex,
      pendingUrl: pendingIndex >= 0 ? photoPreviewUrls[pendingIndex] ?? null : null
    };
  });

  function changeClassroom(next: string) {
    setClassroomId(next);
    setEditing(null);
    setDraft(createDraft(next));
    setPhotoFiles([]);
    setFileInputKey((current) => current + 1);
    setFormNotice("");
    const saved = readTeachingSession();
    saveTeachingSession({
      classroomId: next,
      subjectId: "",
      activity: saved?.activity || "โจทย์ดาวนักคิด",
      repeatMode: saved?.repeatMode ?? "unique"
    });
  }

  function startEdit(student: Student) {
    setEditing(student);
    setDraft({
      student_code: student.student_code,
      student_number: student.student_number,
      full_name: student.full_name,
      nickname: student.nickname,
      classroom_id: student.classroom_id,
      group_id: student.group_id,
      profile_photo_mode: student.profile_photo_mode === "locked" ? "locked" : "random",
      status: student.status
    });
    setPhotoFiles([]);
    setFileInputKey((current) => current + 1);
    setFormError("");
    setFormNotice(`กำลังแก้ไขข้อมูลของ ${student.full_name}`);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function handlePhotoFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = maxPhotosPerStudent - usedPhotoSlots;
    if (remainingSlots <= 0) {
      setFormError("นักเรียน 1 คนเพิ่มรูปได้สูงสุด 5 ภาพ");
      setFileInputKey((current) => current + 1);
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, remainingSlots);
    setPhotoFiles((current) => [...current, ...acceptedFiles]);
    setFileInputKey((current) => current + 1);
    if (selectedFiles.length > acceptedFiles.length) {
      setFormError(`รับเพิ่มได้อีก ${remainingSlots} ภาพเท่านั้น จึงเลือกเฉพาะไฟล์แรกตามจำนวนที่เหลือ`);
    } else {
      setFormError("");
    }
  }

  function removePendingPhoto(index: number) {
    setPhotoFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function openPhotoPicker() {
    if (usedPhotoSlots >= maxPhotosPerStudent || saving) return;
    photoInputRef.current?.click();
  }

  async function handleSetPrimaryPhoto(photo: StudentPhoto) {
    setSaving(true);
    setFormError("");
    try {
      await setPrimaryStudentPhoto(photo.id);
      setFormNotice("ตั้งรูปหลักเรียบร้อยแล้ว");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "ตั้งรูปหลักไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePhoto(photo: StudentPhoto) {
    if (!confirm("ลบรูปนี้ออกจากคลังรูปนักเรียนหรือไม่?")) return;
    setSaving(true);
    setFormError("");
    try {
      await deleteStudentPhoto(photo.id);
      setFormNotice("ลบรูปนักเรียนเรียบร้อยแล้ว");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "ลบรูปไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!draft.full_name.trim()) return;
    const safeCode = draft.student_code.trim() || `S-${draft.classroom_id.slice(0, 4)}-${String(draft.student_number).padStart(3, "0")}`;
    const duplicateNumber = data.students.find(
      (student) => student.classroom_id === draft.classroom_id && student.id !== editing?.id && student.student_number === Number(draft.student_number)
    );
    const duplicateCode = data.students.find((student) => student.id !== editing?.id && student.student_code.trim() === safeCode);

    if (duplicateNumber) {
      setFormError(`เลขที่ ${draft.student_number} ซ้ำกับ ${duplicateNumber.full_name}`);
      return;
    }

    if (duplicateCode) {
      setFormError(`เลขประจำตัว ${safeCode} ซ้ำกับ ${duplicateCode.full_name}`);
      return;
    }

    setSaving(true);
    try {
      const safeDraft = {
        ...draft,
        student_code: safeCode,
        nickname: draft.nickname.trim() || draft.full_name.split(/\s+/)[0]
      };
      if (editing) {
        await updateStudent(editing.id, safeDraft);
        if (photoFiles.length > 0) {
          await addStudentPhotos(editing.id, photoFiles);
        }
      } else {
        const studentId = await addStudent(safeDraft);
        if (photoFiles.length > 0) {
          await addStudentPhotos(studentId, photoFiles);
        }
      }
      setDraft(createDraft(classroomId));
      setEditing(null);
      setPhotoFiles([]);
      setFileInputKey((current) => current + 1);
      setFormNotice(editing ? "บันทึกการแก้ไขนักเรียนเรียบร้อยแล้ว" : "เพิ่มนักเรียนเรียบร้อยแล้ว");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadTemplate() {
    if (!selectedClassroom) return;
    setExcelBusy(true);
    try {
      await downloadStudentExcelTemplate({
        classroom: selectedClassroom,
        students,
        groups
      });
    } finally {
      setExcelBusy(false);
    }
  }

  async function handleExcelImport() {
    if (!classroomId || !excelFile) return;
    setExcelBusy(true);
    setImportResult(null);
    try {
      const rows = await parseStudentExcelFile(excelFile);
      const result = await importStudentRows(classroomId, rows);
      setImportResult(result);
      if (result.errors.length === 0) {
        setExcelFile(null);
      }
    } catch (caught) {
      setImportResult({
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [caught instanceof Error ? caught.message : "นำเข้าไฟล์ Excel ไม่สำเร็จ"]
      });
    } finally {
      setExcelBusy(false);
    }
  }

  async function handleImport() {
    if (!classroomId || !importText.trim()) return;
    await importStudents(classroomId, importText);
    setImportText("");
  }

  async function handleDelete(student: Student) {
    if (!confirm(`ลบนักเรียน ${student.full_name} หรือไม่? ประวัติดาวของนักเรียนคนนี้จะถูกลบด้วย`)) return;
    await deleteStudent(student.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-violet-600">จัดการข้อมูลหลัก</p>
        <h1 className="text-3xl font-black text-violet-950">หน้าจัดการนักเรียน</h1>
      </header>

      <PageCard>
        <div className="grid gap-3 md:grid-cols-[260px_1fr]">
          <div>
            <Label>ห้องเรียน</Label>
            <SelectInput value={classroomId} onChange={(event) => changeClassroom(event.target.value)}>
              {data.classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </SelectInput>
          </div>
          <div className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-800">
            รายการในหน้านี้ใช้ชื่อสมมติใน demo mode และรองรับอัปโหลดรูปไป Supabase Storage เมื่อเชื่อมโปรเจกต์จริง
          </div>
        </div>
      </PageCard>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <div ref={formRef}>
        <PageCard className={editing ? "border-pink-200 bg-gradient-to-br from-white to-pink-50" : undefined}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-violet-600">{editing ? "โหมดแก้ไขข้อมูล" : "เพิ่มข้อมูลใหม่"}</p>
              <h2 className="text-xl font-black text-violet-950">{editing ? "แก้ไขนักเรียน" : "เพิ่มนักเรียน"}</h2>
              {formNotice ? <p className="mt-1 text-sm font-bold text-pink-700">{formNotice}</p> : null}
            </div>
            {editing ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-pink-100">
                <StudentAvatar name={editing.full_name} photoUrl={mainPhotoPreview} size="sm" />
                <div>
                  <p className="text-sm font-black text-violet-950">{editing.nickname}</p>
                  <p className="text-xs font-bold text-slate-500">เลขที่ {editing.student_number}</p>
                </div>
              </div>
            ) : null}
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <Label>เลขประจำตัวนักเรียน</Label>
              <TextInput value={draft.student_code} onChange={(event) => setDraft({ ...draft, student_code: event.target.value })} placeholder="เช่น S2569-401-001" />
            </div>
            <div>
              <Label>เลขที่</Label>
              <TextInput type="number" min={1} value={draft.student_number} onChange={(event) => setDraft({ ...draft, student_number: Number(event.target.value) })} />
            </div>
            <div>
              <Label>ชื่อ-สกุล</Label>
              <TextInput value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} placeholder="เด็กชาย/เด็กหญิง..." />
            </div>
            <div>
              <Label>ชื่อเล่น</Label>
              <TextInput value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} />
            </div>
            <div>
              <Label>กลุ่ม</Label>
              <SelectInput value={draft.group_id ?? ""} onChange={(event) => setDraft({ ...draft, group_id: event.target.value || null })}>
                <option value="">ยังไม่มีกลุ่ม</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <Label>สถานะ</Label>
              <SelectInput value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as StudentDraft["status"] })}>
                <option value="active">เปิดใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
              </SelectInput>
            </div>
            <div className="md:col-span-2 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Label>คลังรูปนักเรียน</Label>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    ใส่ได้สูงสุด {maxPhotosPerStudent} ภาพ แล้วกดเลือกจากรูปในคลังเพื่อใช้เป็นภาพหลัก ไม่ต้องอัปโหลดแยก
                  </p>
                </div>
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm ring-1 ring-violet-100">
                  ใช้แล้ว {usedPhotoSlots}/{maxPhotosPerStudent} ภาพ
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr]">
                <div className="rounded-3xl bg-white p-3 text-center shadow-sm ring-1 ring-violet-100">
                  <StudentAvatar
                    name={draft.full_name || "นักเรียน"}
                    photoUrl={mainPhotoPreview}
                    size="lg"
                    shape="rounded"
                    className="mx-auto aspect-[4/3] h-auto w-full max-w-none bg-[#f8f5ff] object-contain p-1"
                  />
                  <p className="mt-2 text-xs font-black text-violet-800">ภาพหลักที่ใช้ในรายชื่อ</p>
                  <p className="text-[11px] font-bold text-slate-500">
                    {editing
                      ? "กดเลือกรูปด้านขวาเพื่อเปลี่ยนภาพหลัก"
                      : "นักเรียนใหม่จะใช้รูปแรกเป็นภาพหลักหลังบันทึก"}
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    key={fileInputKey}
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => handlePhotoFiles(event.target.files)}
                    disabled={usedPhotoSlots >= maxPhotosPerStudent || saving}
                  />

                  <div className="grid gap-2 rounded-2xl bg-white/80 p-2 shadow-sm ring-1 ring-violet-100 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-2xl p-3 text-left transition ${
                        draft.profile_photo_mode === "random"
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
                          : "bg-white text-violet-950 ring-1 ring-violet-100 hover:bg-violet-50"
                      }`}
                      onClick={() => setDraft({ ...draft, profile_photo_mode: "random" })}
                    >
                      <span className="flex items-center gap-2 text-sm font-black">
                        <Shuffle className="h-4 w-4" />
                        สุ่มแสดงโปรไฟล์
                      </span>
                      <span className={`mt-1 block text-xs font-bold ${draft.profile_photo_mode === "random" ? "text-violet-50" : "text-slate-500"}`}>
                        ตอนสุ่มได้ชื่อ ระบบสุ่ม 1 รูปจากคลังภาพ
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`rounded-2xl p-3 text-left transition ${
                        draft.profile_photo_mode === "locked"
                          ? "bg-gradient-to-r from-amber-300 to-orange-400 text-violet-950 shadow-lg shadow-amber-400/20"
                          : "bg-white text-violet-950 ring-1 ring-violet-100 hover:bg-amber-50"
                      }`}
                      onClick={() => setDraft({ ...draft, profile_photo_mode: "locked" })}
                    >
                      <span className="flex items-center gap-2 text-sm font-black">
                        <Lock className="h-4 w-4" />
                        ล็อคเลือกภาพที่จะแสดง
                      </span>
                      <span className={`mt-1 block text-xs font-bold ${draft.profile_photo_mode === "locked" ? "text-violet-900/75" : "text-slate-500"}`}>
                        ใช้รูปหลักภาพเดียวในหน้าเล่น
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4">
                    {photoSlots.map(({ slotIndex, existingPhoto, pendingIndex, pendingUrl }) => (
                      <div
                        key={existingPhoto?.id ?? pendingUrl ?? `empty-${slotIndex}`}
                        className={`relative overflow-hidden rounded-2xl border-2 border-dashed bg-[#f8f5ff] p-2 shadow-sm transition ${
                          existingPhoto?.is_primary
                            ? "border-amber-300 shadow-amber-200/60 ring-2 ring-amber-100"
                            : "border-violet-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
                        }`}
                      >
                        <div className="absolute left-3 top-3 z-10 rounded-full bg-violet-950/80 px-2.5 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur">
                          รูป {slotIndex + 1}
                        </div>

                        {existingPhoto ? (
                          <>
                            <button
                              type="button"
                              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-white text-left"
                              onClick={() => void handleSetPrimaryPhoto(existingPhoto)}
                              disabled={saving || existingPhoto.is_primary}
                              aria-label={`ใช้รูปที่ ${slotIndex + 1} เป็นภาพหลัก`}
                            >
                              <img src={existingPhoto.photo_url} alt={draft.full_name || "นักเรียน"} className="h-full w-full object-contain p-1 transition group-hover:scale-[1.02]" />
                              <span
                                className={`absolute inset-x-2 bottom-2 rounded-full px-2 py-1 text-center text-[11px] font-black shadow-sm backdrop-blur ${
                                  existingPhoto.is_primary
                                    ? "bg-amber-300 text-violet-950"
                                    : "bg-violet-950/72 text-white opacity-0 transition group-hover:opacity-100"
                                }`}
                              >
                                {existingPhoto.is_primary ? "กำลังใช้เป็นภาพหลัก" : "คลิกเพื่อใช้เป็นภาพหลัก"}
                              </span>
                            </button>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              {existingPhoto.is_primary ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  รูปหลัก
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-black text-violet-700 transition hover:bg-violet-100"
                                  onClick={() => void handleSetPrimaryPhoto(existingPhoto)}
                                  disabled={saving}
                                >
                                  ใช้เป็นภาพหลัก
                                </button>
                              )}
                              <button
                                type="button"
                                className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                onClick={() => void handleDeletePhoto(existingPhoto)}
                                disabled={saving}
                                aria-label="ลบรูปนักเรียน"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : pendingUrl ? (
                          <>
                            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white">
                              <img src={pendingUrl} alt={`รูปใหม่ ${pendingIndex + 1}`} className="h-full w-full object-contain p-1" />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-1 text-[11px] font-black text-pink-700">
                                <ImagePlus className="h-3 w-3" />
                                รอบันทึก
                              </span>
                              <button
                                type="button"
                                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                                onClick={() => removePendingPhoto(pendingIndex)}
                                disabled={saving}
                                aria-label="เอารูปออกจากรายการอัปโหลด"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="grid aspect-[4/3] w-full place-items-center rounded-xl border-2 border-dashed border-violet-200 bg-white/80 p-3 text-center text-violet-700 transition hover:border-pink-300 hover:bg-pink-50 hover:text-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={openPhotoPicker}
                            disabled={usedPhotoSlots >= maxPhotosPerStudent || saving}
                          >
                            <span>
                              <ImagePlus className="mx-auto mb-2 h-7 w-7" />
                              <span className="block text-sm font-black">อัพโหลดเลย</span>
                              <span className="mt-1 block text-[11px] font-bold text-slate-500">PNG/JPG/WEBP</span>
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-bold text-slate-500">
                    ภาพหลักใช้กับรายชื่อและโหมดล็อคภาพ ส่วน “สุ่มแสดงโปรไฟล์” ยังสุ่มจากรูปทั้งหมดในคลังได้ตามเดิม
                  </p>
                </div>
              </div>
            </div>
            {formError ? (
              <div className="md:col-span-2 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600">{formError}</div>
            ) : null}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={saving || !classroomId}>
                <UserPlus className="h-4 w-4" />
                {editing ? "บันทึกนักเรียน" : "เพิ่มนักเรียน"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setDraft(createDraft(classroomId));
                    setPhotoFiles([]);
                    setFileInputKey((current) => current + 1);
                    setFormNotice("");
                  }}
                >
                  ยกเลิก
                </Button>
              ) : null}
            </div>
          </form>
        </PageCard>
        </div>

        <PageCard>
          <div className="mb-4 flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-violet-950">นำเข้า/ส่งออก Excel</h2>
              <p className="text-sm font-semibold text-slate-500">โหลดแบบฟอร์ม แก้ใน Excel แล้วนำกลับเข้า ระบบจะรักษาดาวจาก student_id เดิม</p>
            </div>
          </div>

          <div className="grid gap-3">
            <Button variant="success" onClick={() => void handleDownloadTemplate()} disabled={!selectedClassroom || excelBusy}>
              <Download className="h-4 w-4" />
              โหลดแบบฟอร์ม Excel
            </Button>
            <div>
              <Label>ไฟล์ Excel ที่แก้ไขแล้ว</Label>
              <TextInput
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setExcelFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <Button variant="secondary" onClick={() => void handleExcelImport()} disabled={!excelFile || excelBusy}>
              <Upload className="h-4 w-4" />
              นำเข้า Excel
            </Button>

            {importResult ? (
              <div className={importResult.errors.length ? "rounded-2xl bg-rose-50 p-3" : "rounded-2xl bg-emerald-50 p-3"}>
                <div className="mb-2 flex items-center gap-2 font-black">
                  {importResult.errors.length ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                      <span className="text-rose-700">ยังไม่ได้นำเข้า เพราะพบข้อมูลที่ต้องแก้</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-emerald-700">
                        นำเข้าสำเร็จ: เพิ่ม {importResult.created} คน · อัปเดต {importResult.updated} คน
                      </span>
                    </>
                  )}
                </div>
                {importResult.skipped ? <p className="text-sm font-semibold text-slate-500">ข้ามแถวว่าง {importResult.skipped} แถว</p> : null}
                {importResult.errors.length ? (
                  <ul className="space-y-1 text-sm font-bold text-rose-700">
                    {importResult.errors.slice(0, 8).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-violet-100 pt-4">
            <h3 className="mb-2 font-black text-violet-950">นำเข้ารายชื่อเร็ว</h3>
            <TextArea value={importText} onChange={(event) => setImportText(event.target.value)} />
            <Button className="mt-3 w-full" variant="light" onClick={() => void handleImport()}>
              <Upload className="h-4 w-4" />
              นำเข้าจากข้อความ
            </Button>
          </div>
        </PageCard>
      </section>

      <PageCard>
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-violet-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-violet-950">รายชื่อนักเรียนในห้องนี้</p>
            <p className="text-xs font-bold text-slate-500">
              แสดงทั้งหมด {classroomStudentRows.length} คน · เปิดใช้งาน {activeStudentCount} คน · ปิดใช้งาน {inactiveStudentCount} คน
            </p>
          </div>
          <div className="grid grid-cols-3 rounded-xl bg-white p-1 shadow-sm ring-1 ring-violet-100">
            {[
              { value: "all", label: "ทั้งหมด" },
              { value: "active", label: "เปิดใช้งาน" },
              { value: "inactive", label: "ปิดใช้งาน" }
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`rounded-lg px-3 py-2 text-xs font-black transition ${
                  statusFilter === item.value ? "bg-violet-700 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50 hover:text-violet-800"
                }`}
                onClick={() => setStatusFilter(item.value as StudentStatusFilter)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {students.length === 0 ? (
          <EmptyState title={classroomStudentRows.length === 0 ? "ยังไม่มีนักเรียนในห้องนี้" : "ไม่พบนักเรียนตามสถานะที่เลือก"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-separate border-spacing-y-2 text-left">
              <thead className="text-sm text-slate-500">
                <tr>
                  <th className="px-3 py-2">เลขที่</th>
                  <th className="px-3 py-2">เลขประจำตัว</th>
                  <th className="px-3 py-2">รูป</th>
                  <th className="px-3 py-2">ชื่อ-สกุล</th>
                  <th className="px-3 py-2">ชื่อเล่น</th>
                  <th className="px-3 py-2">กลุ่ม</th>
                  <th className="px-3 py-2">ดาวสะสม</th>
                  <th className="px-3 py-2">สถานะ</th>
                  <th className="px-3 py-2 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const group = studentGroup(data.groups, student);
                  return (
                    <tr key={student.id} className={student.status === "inactive" ? "bg-slate-50 shadow-sm opacity-85" : "bg-white shadow-sm"}>
                      <td className="rounded-l-2xl px-3 py-3 font-black">{student.student_number}</td>
                      <td className="px-3 py-3 text-sm font-bold text-slate-500">{student.student_code}</td>
                      <td className="px-3 py-3">
                        <StudentAvatar name={student.full_name} photoUrl={primaryStudentPhoto(data.studentPhotos, student)} size="sm" />
                      </td>
                      <td className="px-3 py-3 font-extrabold text-violet-950">{student.full_name}</td>
                      <td className="px-3 py-3 font-semibold">{student.nickname}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: group?.color ?? "#94a3b8" }}>
                          {group?.name ?? "ยังไม่มีกลุ่ม"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-black text-amber-500">{formatStars(sumStudentStars(data.starEvents, student.id))} ⭐</td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            student.status === "active"
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600"
                              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500"
                          }
                        >
                          {student.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </span>
                        {student.status === "inactive" ? <p className="mt-1 text-[11px] font-bold text-slate-400">ไม่เข้าร่วมการสุ่ม</p> : null}
                      </td>
                      <td className="rounded-r-2xl px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="light" title="แก้ไขข้อมูลนักเรียน" aria-label={`แก้ไขข้อมูล ${student.full_name}`} onClick={() => startEdit(student)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="danger" title="ลบนักเรียน" aria-label={`ลบนักเรียน ${student.full_name}`} onClick={() => void handleDelete(student)}>
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
    </div>
  );
}
