"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sampleData } from "@/lib/sample-data";
import { dispatchStarAwardBurst } from "@/lib/star-burst";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { prepareStudentImportOperations, type StudentImportResult, type StudentImportRow } from "@/lib/student-import";
import type {
  Classroom,
  ClassroomDraft,
  DataBundle,
  Group,
  GroupDraft,
  ProfilePhotoMode,
  RandomLog,
  RandomMode,
  StarEvent,
  StarEventType,
  Student,
  StudentDraft,
  StudentPhoto,
  Subject,
  SubjectDraft
} from "@/lib/types";
import { fileToDataUrl, nowIso, parseImportLines, uid } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

type AddStarEventInput = {
  student_id?: string | null;
  group_id?: string | null;
  classroom_id: string;
  subject_id?: string | null;
  activity_name?: string;
  reason: string;
  stars: number;
  event_type: StarEventType;
};

type AddGroupMemberStarEventsInput = {
  group_id: string;
  classroom_id: string;
  subject_id?: string | null;
  activity_name?: string;
  reason: string;
  stars: number;
};

type AddStudentStarEventsInput = {
  student_ids: string[];
  classroom_id: string;
  subject_id?: string | null;
  activity_name?: string;
  reason: string;
  stars: number;
};

type ResetStarEventsInput = {
  classroom_id?: string | null;
};

type DataContextValue = {
  data: DataBundle;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  isGuestMode: boolean;
  refresh: () => Promise<void>;
  resetDemoData: () => void;
  addClassroom: (draft: ClassroomDraft, imageFile?: File | null) => Promise<void>;
  updateClassroom: (id: string, draft: Partial<ClassroomDraft>, imageFile?: File | null) => Promise<void>;
  deleteClassroom: (id: string) => Promise<void>;
  addStudent: (draft: StudentDraft, photoFile?: File | null) => Promise<string>;
  updateStudent: (id: string, draft: Partial<StudentDraft>, photoFile?: File | null) => Promise<void>;
  addStudentPhotos: (studentId: string, files: File[]) => Promise<void>;
  deleteStudentPhoto: (photoId: string) => Promise<void>;
  setPrimaryStudentPhoto: (photoId: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  importStudents: (classroomId: string, lines: string) => Promise<void>;
  importStudentRows: (classroomId: string, rows: StudentImportRow[]) => Promise<StudentImportResult>;
  addGroup: (draft: GroupDraft, iconFile?: File | null) => Promise<void>;
  updateGroup: (id: string, draft: Partial<GroupDraft>, iconFile?: File | null) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  assignStudentToGroup: (studentId: string, groupId: string | null) => Promise<void>;
  addSubject: (draft: SubjectDraft) => Promise<void>;
  updateSubject: (id: string, draft: Partial<SubjectDraft>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addStarEvent: (input: AddStarEventInput) => Promise<void>;
  addStudentStarEvents: (input: AddStudentStarEventsInput) => Promise<number>;
  addGroupMemberStarEvents: (input: AddGroupMemberStarEventsInput) => Promise<number>;
  resetStarEvents: (input?: ResetStarEventsInput) => Promise<void>;
  logRandom: (input: {
    classroom_id: string;
    subject_id?: string | null;
    student_id?: string | null;
    group_id?: string | null;
    mode: RandomMode;
  }) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);
const storageKey = "suum-sanuk-dao-nakkhit-demo-v1";
const maxStudentPhotos = 5;
const maxUploadBytes = 5 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const emptyDataBundle: DataBundle = {
  classrooms: [],
  students: [],
  studentPhotos: [],
  groups: [],
  subjects: [],
  starEvents: [],
  randomLogs: []
};

function normalizeProfilePhotoMode(mode: unknown): ProfilePhotoMode {
  return mode === "locked" ? "locked" : "random";
}

function legacyStudentPhotos(students: Student[]) {
  return students
    .filter((student) => Boolean(student.photo_url))
    .map(
      (student): StudentPhoto => ({
        id: `${student.id}-legacy-photo`,
        student_id: student.id,
        photo_url: student.photo_url ?? "",
        sort_order: 0,
        is_primary: true,
        created_at: student.created_at
      })
    );
}

function normalizeDataBundle(bundle: DataBundle) {
  const studentPhotos = Array.isArray(bundle.studentPhotos) ? bundle.studentPhotos : [];
  const photoStudentIds = new Set(studentPhotos.map((photo) => photo.student_id));
  const migratedLegacyPhotos = legacyStudentPhotos(bundle.students).filter((photo) => !photoStudentIds.has(photo.student_id));
  const normalizedPhotos = [...studentPhotos, ...migratedLegacyPhotos];
  const primaryByStudent = new Map<string, string>();

  normalizedPhotos.forEach((photo) => {
    if (photo.is_primary || !primaryByStudent.has(photo.student_id)) {
      primaryByStudent.set(photo.student_id, photo.photo_url);
    }
  });

  return {
    ...bundle,
    classrooms: bundle.classrooms.map((classroom) => ({
      ...classroom,
      image_url: classroom.image_url ?? null
    })),
    students: bundle.students.map((student) => ({
      ...student,
      photo_url: primaryByStudent.get(student.id) ?? student.photo_url ?? null,
      profile_photo_mode: normalizeProfilePhotoMode(student.profile_photo_mode)
    })),
    studentPhotos: normalizedPhotos
  };
}

function validateImageFile(file: File) {
  if (!supportedImageTypes.has(file.type)) {
    throw new Error("รองรับเฉพาะไฟล์รูป .jpg, .jpeg, .png, .webp หรือ .gif");
  }

  if (file.size > maxUploadBytes) {
    throw new Error("ขนาดไฟล์รูปต้องไม่เกิน 5MB");
  }
}

function cloneSampleData(): DataBundle {
  return normalizeDataBundle(JSON.parse(JSON.stringify(sampleData)) as DataBundle);
}

function readDemoData() {
  if (typeof window === "undefined") return cloneSampleData();
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return cloneSampleData();
  try {
    return normalizeDataBundle(JSON.parse(stored) as DataBundle);
  } catch {
    return cloneSampleData();
  }
}

function saveDemoData(data: DataBundle) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }
}

function announceStarAward(data: DataBundle, input: AddStarEventInput) {
  if (input.stars <= 0) return;

  if (input.event_type === "student" && input.student_id) {
    const student = data.students.find((item) => item.id === input.student_id);
    dispatchStarAwardBurst({
      stars: input.stars,
      reason: input.reason,
      recipientName: student?.nickname || student?.full_name || "นักเรียน",
      recipientDetail: student?.full_name && student.full_name !== student.nickname ? student.full_name : undefined,
      eventType: "student"
    });
    return;
  }

  if (input.event_type === "group" && input.group_id) {
    const group = data.groups.find((item) => item.id === input.group_id);
    dispatchStarAwardBurst({
      stars: input.stars,
      reason: input.reason,
      recipientName: group?.name || "กลุ่มนักเรียน",
      recipientDetail: "กลุ่มภารกิจ",
      eventType: "group"
    });
  }
}

function announceMultipleStudentAward(data: DataBundle, input: AddStudentStarEventsInput, count: number) {
  if (input.stars <= 0 || count <= 0) return;
  const selectedStudents = data.students.filter((student) => input.student_ids.includes(student.id));
  const previewNames = selectedStudents.slice(0, 3).map((student) => student.nickname || student.full_name);
  const extraCount = Math.max(0, count - previewNames.length);

  dispatchStarAwardBurst({
    stars: input.stars,
    reason: input.reason,
    recipientName: `นักเรียน ${count} คน`,
    recipientDetail: `${previewNames.join(", ")}${extraCount > 0 ? ` และอีก ${extraCount} คน` : ""}`,
    eventType: "student"
  });
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isSupabaseEnabled } = useAuth();
  const isDemoMode = !isSupabaseEnabled;
  const isGuestMode = isSupabaseEnabled && !user;
  const [data, setData] = useState<DataBundle>(emptyDataBundle);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      const demo = readDemoData();
      setData(demo);
      saveDemoData(demo);
      setLoading(false);
      return;
    }

    if (!user) {
      setData(cloneSampleData());
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const [classrooms, students, studentPhotos, groups, subjects, starEvents, randomLogs] = await Promise.all([
        supabase.from("classrooms").select("*").order("created_at", { ascending: false }),
        supabase.from("students").select("*").order("student_number", { ascending: true }),
        supabase.from("student_photos").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        supabase.from("groups").select("*").order("created_at", { ascending: true }),
        supabase.from("subjects").select("*").order("created_at", { ascending: true }),
        supabase.from("star_events").select("*").order("created_at", { ascending: false }),
        supabase.from("random_logs").select("*").order("created_at", { ascending: false })
      ]);

      const firstError =
        classrooms.error || students.error || studentPhotos.error || groups.error || subjects.error || starEvents.error || randomLogs.error;
      if (firstError) throw firstError;

      setData(normalizeDataBundle({
        classrooms: (classrooms.data ?? []) as Classroom[],
        students: (students.data ?? []) as Student[],
        studentPhotos: (studentPhotos.data ?? []) as StudentPhoto[],
        groups: (groups.data ?? []) as Group[],
        subjects: (subjects.data ?? []) as Subject[],
        starEvents: (starEvents.data ?? []) as StarEvent[],
        randomLogs: (randomLogs.data ?? []) as RandomLog[]
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, user]);

  useEffect(() => {
    if (!authLoading) {
      void refresh();
    }
  }, [authLoading, refresh]);

  const mutateDemo = useCallback((updater: (current: DataBundle) => DataBundle) => {
    setData((current) => {
      const next = updater(current);
      saveDemoData(next);
      return next;
    });
  }, []);

  const uploadAsset = useCallback(
    async (bucket: "student-photos" | "group-icons" | "classroom-images", folder: string, file?: File | null) => {
      if (!file) return null;
      validateImageFile(file);

      if (isDemoMode) {
        return fileToDataUrl(file);
      }

      const supabase = getSupabaseBrowserClient();
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${uid()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600"
      });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrl.publicUrl;
    },
    [isDemoMode]
  );

  const addClassroom = useCallback(
    async (draft: ClassroomDraft, imageFile?: File | null) => {
      const id = uid();
      const imageUrl = (await uploadAsset("classroom-images", id, imageFile)) ?? draft.image_url ?? null;
      const row: Classroom = { ...draft, id, image_url: imageUrl, created_at: nowIso() };
      if (isDemoMode) {
        mutateDemo((current) => ({ ...current, classrooms: [row, ...current.classrooms] }));
        return;
      }
      const { error: insertError } = await getSupabaseBrowserClient().from("classrooms").insert(row);
      if (insertError) throw insertError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh, uploadAsset]
  );

  const updateClassroom = useCallback(
    async (id: string, draft: Partial<ClassroomDraft>, imageFile?: File | null) => {
      const imageUrl = imageFile ? await uploadAsset("classroom-images", id, imageFile) : undefined;
      const patch = imageUrl ? { ...draft, image_url: imageUrl } : draft;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          classrooms: current.classrooms.map((classroom) => (classroom.id === id ? { ...classroom, ...patch } : classroom))
        }));
        return;
      }
      const { error: updateError } = await getSupabaseBrowserClient().from("classrooms").update(patch).eq("id", id);
      if (updateError) throw updateError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh, uploadAsset]
  );

  const deleteClassroom = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        mutateDemo((current) => ({
          classrooms: current.classrooms.filter((classroom) => classroom.id !== id),
          students: current.students.filter((student) => student.classroom_id !== id),
          studentPhotos: current.studentPhotos.filter((photo) => {
            const student = current.students.find((item) => item.id === photo.student_id);
            return student?.classroom_id !== id;
          }),
          groups: current.groups.filter((group) => group.classroom_id !== id),
          subjects: current.subjects.filter((subject) => subject.classroom_id !== id),
          starEvents: current.starEvents.filter((event) => event.classroom_id !== id),
          randomLogs: current.randomLogs.filter((log) => log.classroom_id !== id)
        }));
        return;
      }
      const { error: deleteError } = await getSupabaseBrowserClient().from("classrooms").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh]
  );

  const addStudent = useCallback(
    async (draft: StudentDraft, photoFile?: File | null) => {
      const id = uid();
      const photoUrl = (await uploadAsset("student-photos", draft.classroom_id, photoFile)) ?? draft.photo_url ?? null;
      const row: Student = { ...draft, id, photo_url: photoUrl, created_at: nowIso() };
      const initialPhoto: StudentPhoto | null = photoUrl
        ? {
            id: uid(),
            student_id: id,
            photo_url: photoUrl,
            sort_order: 0,
            is_primary: true,
            created_at: row.created_at
          }
        : null;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          students: [...current.students, row],
          studentPhotos: initialPhoto ? [...current.studentPhotos, initialPhoto] : current.studentPhotos
        }));
        return id;
      }
      const supabase = getSupabaseBrowserClient();
      const { error: insertError } = await supabase.from("students").insert(row);
      if (insertError) throw insertError;
      if (initialPhoto) {
        const { error: photoInsertError } = await supabase.from("student_photos").insert(initialPhoto);
        if (photoInsertError) throw photoInsertError;
      }
      await refresh();
      return id;
    },
    [isDemoMode, mutateDemo, refresh, uploadAsset]
  );

  const updateStudent = useCallback(
    async (id: string, draft: Partial<StudentDraft>, photoFile?: File | null) => {
      const currentCount = data.studentPhotos.filter((photo) => photo.student_id === id).length;
      if (photoFile && currentCount >= maxStudentPhotos) {
        throw new Error("นักเรียน 1 คนเพิ่มรูปได้สูงสุด 5 ภาพ");
      }

      const photoUrl = photoFile ? await uploadAsset("student-photos", draft.classroom_id ?? "students", photoFile) : undefined;
      const patch = photoUrl ? { ...draft, photo_url: photoUrl } : draft;
      const nextPhoto: StudentPhoto | null = photoUrl
        ? {
            id: uid(),
            student_id: id,
            photo_url: photoUrl,
            sort_order: currentCount,
            is_primary: true,
            created_at: nowIso()
          }
        : null;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          students: current.students.map((student) => (student.id === id ? { ...student, ...patch } : student)),
          studentPhotos: nextPhoto
            ? [...current.studentPhotos.map((photo) => (photo.student_id === id ? { ...photo, is_primary: false } : photo)), nextPhoto]
            : current.studentPhotos
        }));
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.from("students").update(patch).eq("id", id);
      if (updateError) throw updateError;
      if (nextPhoto) {
        const { error: clearPrimaryError } = await supabase.from("student_photos").update({ is_primary: false }).eq("student_id", id);
        if (clearPrimaryError) throw clearPrimaryError;
        const { error: photoInsertError } = await supabase.from("student_photos").insert(nextPhoto);
        if (photoInsertError) throw photoInsertError;
      }
      await refresh();
    },
    [data.studentPhotos, isDemoMode, mutateDemo, refresh, uploadAsset]
  );

  const addStudentPhotos = useCallback(
    async (studentId: string, files: File[]) => {
      if (files.length === 0) return;

      const currentPhotos = data.studentPhotos.filter((photo) => photo.student_id === studentId);
      if (currentPhotos.length + files.length > maxStudentPhotos) {
        throw new Error("นักเรียน 1 คนเพิ่มรูปได้สูงสุด 5 ภาพ");
      }

      const hasPrimary = currentPhotos.some((photo) => photo.is_primary);
      const uploadedRows: StudentPhoto[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const photoUrl = await uploadAsset("student-photos", studentId, files[index]);
        if (!photoUrl) continue;
        uploadedRows.push({
          id: uid(),
          student_id: studentId,
          photo_url: photoUrl,
          sort_order: currentPhotos.length + index,
          is_primary: !hasPrimary && index === 0,
          created_at: nowIso()
        });
      }

      if (uploadedRows.length === 0) return;
      const newPrimary = uploadedRows.find((photo) => photo.is_primary) ?? null;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          students: current.students.map((student) =>
            student.id === studentId && newPrimary ? { ...student, photo_url: newPrimary.photo_url } : student
          ),
          studentPhotos: [...current.studentPhotos, ...uploadedRows]
        }));
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: insertError } = await supabase.from("student_photos").insert(uploadedRows);
      if (insertError) throw insertError;
      if (newPrimary) {
        const { error: studentUpdateError } = await supabase.from("students").update({ photo_url: newPrimary.photo_url }).eq("id", studentId);
        if (studentUpdateError) throw studentUpdateError;
      }
      await refresh();
    },
    [data.studentPhotos, isDemoMode, mutateDemo, refresh, uploadAsset]
  );

  const deleteStudentPhoto = useCallback(
    async (photoId: string) => {
      const photo = data.studentPhotos.find((item) => item.id === photoId);
      if (!photo) return;

      const remainingPhotos = data.studentPhotos
        .filter((item) => item.student_id === photo.student_id && item.id !== photoId)
        .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
      const nextPrimary = photo.is_primary ? remainingPhotos[0] ?? null : null;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          students: current.students.map((student) =>
            student.id === photo.student_id && photo.is_primary ? { ...student, photo_url: nextPrimary?.photo_url ?? null } : student
          ),
          studentPhotos: current.studentPhotos
            .filter((item) => item.id !== photoId)
            .map((item) => (nextPrimary && item.id === nextPrimary.id ? { ...item, is_primary: true } : item))
        }));
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: deleteError } = await supabase.from("student_photos").delete().eq("id", photoId);
      if (deleteError) throw deleteError;
      if (photo.is_primary) {
        if (nextPrimary) {
          const { error: nextPrimaryError } = await supabase.from("student_photos").update({ is_primary: true }).eq("id", nextPrimary.id);
          if (nextPrimaryError) throw nextPrimaryError;
        }
        const { error: studentUpdateError } = await supabase
          .from("students")
          .update({ photo_url: nextPrimary?.photo_url ?? null })
          .eq("id", photo.student_id);
        if (studentUpdateError) throw studentUpdateError;
      }
      await refresh();
    },
    [data.studentPhotos, isDemoMode, mutateDemo, refresh]
  );

  const setPrimaryStudentPhoto = useCallback(
    async (photoId: string) => {
      const photo = data.studentPhotos.find((item) => item.id === photoId);
      if (!photo) return;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          students: current.students.map((student) =>
            student.id === photo.student_id ? { ...student, photo_url: photo.photo_url } : student
          ),
          studentPhotos: current.studentPhotos.map((item) => ({
            ...item,
            is_primary: item.student_id === photo.student_id ? item.id === photoId : item.is_primary
          }))
        }));
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: clearPrimaryError } = await supabase.from("student_photos").update({ is_primary: false }).eq("student_id", photo.student_id);
      if (clearPrimaryError) throw clearPrimaryError;
      const { error: setPrimaryError } = await supabase.from("student_photos").update({ is_primary: true }).eq("id", photoId);
      if (setPrimaryError) throw setPrimaryError;
      const { error: studentUpdateError } = await supabase.from("students").update({ photo_url: photo.photo_url }).eq("id", photo.student_id);
      if (studentUpdateError) throw studentUpdateError;
      await refresh();
    },
    [data.studentPhotos, isDemoMode, mutateDemo, refresh]
  );

  const deleteStudent = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          students: current.students.filter((student) => student.id !== id),
          studentPhotos: current.studentPhotos.filter((photo) => photo.student_id !== id),
          starEvents: current.starEvents.filter((event) => event.student_id !== id),
          randomLogs: current.randomLogs.filter((log) => log.student_id !== id)
        }));
        return;
      }
      const { error: deleteError } = await getSupabaseBrowserClient().from("students").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh]
  );

  const importStudents = useCallback(
    async (classroomId: string, lines: string) => {
      const drafts = parseImportLines(lines, classroomId);
      for (const draft of drafts) {
        await addStudent(draft);
      }
    },
    [addStudent]
  );

  const importStudentRows = useCallback(
    async (classroomId: string, rows: StudentImportRow[]) => {
      const { operations, errors, skipped } = prepareStudentImportOperations({
        classroomId,
        rows,
        students: data.students,
        groups: data.groups.filter((group) => group.classroom_id === classroomId)
      });

      if (errors.length > 0) {
        return { created: 0, updated: 0, skipped, errors };
      }

      if (operations.length === 0) {
        return { created: 0, updated: 0, skipped, errors: [] };
      }

      if (isDemoMode) {
        mutateDemo((current) => {
          const updatedStudents = [...current.students];
          operations.forEach((operation) => {
            if (operation.type === "update") {
              const index = updatedStudents.findIndex((student) => student.id === operation.id);
              if (index >= 0) {
                updatedStudents[index] = {
                  ...updatedStudents[index],
                  ...operation.draft,
                  photo_url: updatedStudents[index].photo_url
                };
              }
            } else {
              updatedStudents.push({
                ...operation.draft,
                id: uid(),
                photo_url: null,
                created_at: nowIso()
              });
            }
          });

          return {
            ...current,
            students: updatedStudents.sort((a, b) => a.student_number - b.student_number)
          };
        });

        return {
          created: operations.filter((operation) => operation.type === "create").length,
          updated: operations.filter((operation) => operation.type === "update").length,
          skipped,
          errors: []
        };
      }

      const supabase = getSupabaseBrowserClient();
      const numberChanges = operations.filter(
        (operation) => operation.type === "update" && operation.originalStudent.student_number !== operation.draft.student_number
      );
      const maxNumber = Math.max(0, ...data.students.filter((student) => student.classroom_id === classroomId).map((student) => student.student_number));

      for (let index = 0; index < numberChanges.length; index += 1) {
        const operation = numberChanges[index];
        if (operation.type !== "update") continue;
        const { error: tempError } = await supabase
          .from("students")
          .update({ student_number: maxNumber + 1000 + index })
          .eq("id", operation.id);
        if (tempError) throw tempError;
      }

      for (const operation of operations) {
        if (operation.type === "update") {
          const { error: updateError } = await supabase.from("students").update(operation.draft).eq("id", operation.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from("students").insert({
            ...operation.draft,
            id: uid(),
            photo_url: null,
            created_at: nowIso()
          });
          if (insertError) throw insertError;
        }
      }

      await refresh();

      return {
        created: operations.filter((operation) => operation.type === "create").length,
        updated: operations.filter((operation) => operation.type === "update").length,
        skipped,
        errors: []
      };
    },
    [data.groups, data.students, isDemoMode, mutateDemo, refresh]
  );

  const addGroup = useCallback(
    async (draft: GroupDraft, iconFile?: File | null) => {
      const iconUrl = (await uploadAsset("group-icons", draft.classroom_id, iconFile)) ?? draft.icon_url ?? null;
      const row: Group = { ...draft, id: uid(), icon_url: iconUrl, created_at: nowIso() };

      if (isDemoMode) {
        mutateDemo((current) => ({ ...current, groups: [...current.groups, row] }));
        return;
      }
      const { error: insertError } = await getSupabaseBrowserClient().from("groups").insert(row);
      if (insertError) throw insertError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh, uploadAsset]
  );

  const updateGroup = useCallback(
    async (id: string, draft: Partial<GroupDraft>, iconFile?: File | null) => {
      const iconUrl = iconFile ? await uploadAsset("group-icons", draft.classroom_id ?? "groups", iconFile) : undefined;
      const patch = iconUrl ? { ...draft, icon_url: iconUrl } : draft;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          groups: current.groups.map((group) => (group.id === id ? { ...group, ...patch } : group))
        }));
        return;
      }
      const { error: updateError } = await getSupabaseBrowserClient().from("groups").update(patch).eq("id", id);
      if (updateError) throw updateError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh, uploadAsset]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          groups: current.groups.filter((group) => group.id !== id),
          students: current.students.map((student) => (student.group_id === id ? { ...student, group_id: null } : student)),
          starEvents: current.starEvents.filter((event) => event.group_id !== id),
          randomLogs: current.randomLogs.filter((log) => log.group_id !== id)
        }));
        return;
      }
      const { error: deleteError } = await getSupabaseBrowserClient().from("groups").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh]
  );

  const assignStudentToGroup = useCallback(
    async (studentId: string, groupId: string | null) => {
      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          students: current.students.map((student) => (student.id === studentId ? { ...student, group_id: groupId } : student))
        }));
        return;
      }
      const { error: updateError } = await getSupabaseBrowserClient()
        .from("students")
        .update({ group_id: groupId })
        .eq("id", studentId);
      if (updateError) throw updateError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh]
  );

  const addSubject = useCallback(
    async (draft: SubjectDraft) => {
      const row: Subject = { ...draft, id: uid(), created_at: nowIso() };
      if (isDemoMode) {
        mutateDemo((current) => ({ ...current, subjects: [...current.subjects, row] }));
        return;
      }
      const { error: insertError } = await getSupabaseBrowserClient().from("subjects").insert(row);
      if (insertError) throw insertError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh]
  );

  const updateSubject = useCallback(
    async (id: string, draft: Partial<SubjectDraft>) => {
      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          subjects: current.subjects.map((subject) => (subject.id === id ? { ...subject, ...draft } : subject))
        }));
        return;
      }
      const { error: updateError } = await getSupabaseBrowserClient().from("subjects").update(draft).eq("id", id);
      if (updateError) throw updateError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh]
  );

  const deleteSubject = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          subjects: current.subjects.filter((subject) => subject.id !== id),
          starEvents: current.starEvents.map((event) => (event.subject_id === id ? { ...event, subject_id: null } : event)),
          randomLogs: current.randomLogs.map((log) => (log.subject_id === id ? { ...log, subject_id: null } : log))
        }));
        return;
      }
      const { error: deleteError } = await getSupabaseBrowserClient().from("subjects").delete().eq("id", id);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [isDemoMode, mutateDemo, refresh]
  );

  const addStarEvent = useCallback(
    async (input: AddStarEventInput) => {
      const row: StarEvent = {
        id: uid(),
        student_id: input.student_id ?? null,
        group_id: input.group_id ?? null,
        classroom_id: input.classroom_id,
        subject_id: input.subject_id ?? null,
        activity_name: input.activity_name?.trim() || "กิจกรรมในชั้นเรียน",
        reason: input.reason,
        stars: input.stars,
        event_type: input.event_type,
        created_at: nowIso()
      };

      if (isDemoMode) {
        mutateDemo((current) => ({ ...current, starEvents: [row, ...current.starEvents] }));
        announceStarAward(data, input);
        return;
      }
      if (isGuestMode) {
        announceStarAward(data, input);
        return;
      }
      const { error: insertError } = await getSupabaseBrowserClient().from("star_events").insert(row);
      if (insertError) throw insertError;
      announceStarAward(data, input);
      await refresh();
    },
    [data, isDemoMode, isGuestMode, mutateDemo, refresh]
  );

  const addGroupMemberStarEvents = useCallback(
    async (input: AddGroupMemberStarEventsInput) => {
      const group = data.groups.find((item) => item.id === input.group_id);
      const members = data.students
        .filter((student) => student.group_id === input.group_id)
        .filter((student) => student.classroom_id === input.classroom_id)
        .filter((student) => student.status === "active");

      if (!group) {
        throw new Error("ไม่พบกลุ่มที่ต้องการให้ดาว");
      }

      if (members.length === 0) {
        throw new Error("กลุ่มนี้ยังไม่มีสมาชิก จึงกระจายดาวไม่ได้");
      }

      const createdAt = nowIso();
      const activityName = input.activity_name?.trim() || "กิจกรรมในชั้นเรียน";
      const baseReason = input.reason.trim() || "ให้ดาวกลุ่ม";
      const reason = `${baseReason} (${group.name})`;
      const rows: StarEvent[] = members.map((student) => ({
        id: uid(),
        student_id: student.id,
        group_id: null,
        classroom_id: input.classroom_id,
        subject_id: input.subject_id ?? null,
        activity_name: activityName,
        reason,
        stars: input.stars,
        event_type: "student",
        created_at: createdAt
      }));

      if (isDemoMode) {
        mutateDemo((current) => ({ ...current, starEvents: [...rows, ...current.starEvents] }));
        announceStarAward(data, {
          group_id: input.group_id,
          classroom_id: input.classroom_id,
          subject_id: input.subject_id ?? null,
          activity_name: activityName,
          reason: `${baseReason} · สมาชิก ${members.length} คน`,
          stars: input.stars,
          event_type: "group"
        });
        return members.length;
      }
      if (isGuestMode) {
        announceStarAward(data, {
          group_id: input.group_id,
          classroom_id: input.classroom_id,
          subject_id: input.subject_id ?? null,
          activity_name: activityName,
          reason: `${baseReason} · สมาชิก ${members.length} คน`,
          stars: input.stars,
          event_type: "group"
        });
        return members.length;
      }

      const { error: insertError } = await getSupabaseBrowserClient().from("star_events").insert(rows);
      if (insertError) throw insertError;
      announceStarAward(data, {
        group_id: input.group_id,
        classroom_id: input.classroom_id,
        subject_id: input.subject_id ?? null,
        activity_name: activityName,
        reason: `${baseReason} · สมาชิก ${members.length} คน`,
        stars: input.stars,
        event_type: "group"
      });
      await refresh();
      return members.length;
    },
    [data, isDemoMode, isGuestMode, mutateDemo, refresh]
  );

  const addStudentStarEvents = useCallback(
    async (input: AddStudentStarEventsInput) => {
      const studentIds = Array.from(new Set(input.student_ids)).filter(Boolean);
      const recipients = data.students
        .filter((student) => studentIds.includes(student.id))
        .filter((student) => student.classroom_id === input.classroom_id)
        .filter((student) => student.status === "active");

      if (recipients.length === 0) {
        throw new Error("กรุณาเลือกนักเรียนอย่างน้อย 1 คน");
      }

      const createdAt = nowIso();
      const activityName = input.activity_name?.trim() || "กิจกรรมในชั้นเรียน";
      const reason = input.reason.trim() || "แจกดาวทันที";
      const rows: StarEvent[] = recipients.map((student) => ({
        id: uid(),
        student_id: student.id,
        group_id: null,
        classroom_id: input.classroom_id,
        subject_id: input.subject_id ?? null,
        activity_name: activityName,
        reason,
        stars: input.stars,
        event_type: "student",
        created_at: createdAt
      }));

      if (isDemoMode) {
        mutateDemo((current) => ({ ...current, starEvents: [...rows, ...current.starEvents] }));
        announceMultipleStudentAward(data, input, recipients.length);
        return recipients.length;
      }

      if (isGuestMode) {
        announceMultipleStudentAward(data, input, recipients.length);
        return recipients.length;
      }

      const { error: insertError } = await getSupabaseBrowserClient().from("star_events").insert(rows);
      if (insertError) throw insertError;
      announceMultipleStudentAward(data, input, recipients.length);
      await refresh();
      return recipients.length;
    },
    [data, isDemoMode, isGuestMode, mutateDemo, refresh]
  );

  const logRandom = useCallback(
    async (input: {
      classroom_id: string;
      subject_id?: string | null;
      student_id?: string | null;
      group_id?: string | null;
      mode: RandomMode;
    }) => {
      const row: RandomLog = {
        id: uid(),
        classroom_id: input.classroom_id,
        subject_id: input.subject_id ?? null,
        student_id: input.student_id ?? null,
        group_id: input.group_id ?? null,
        mode: input.mode,
        created_at: nowIso()
      };

      if (isDemoMode) {
        mutateDemo((current) => ({ ...current, randomLogs: [row, ...current.randomLogs] }));
        return;
      }
      if (isGuestMode) {
        return;
      }
      const { error: insertError } = await getSupabaseBrowserClient().from("random_logs").insert(row);
      if (insertError) throw insertError;
      await refresh();
    },
    [isDemoMode, isGuestMode, mutateDemo, refresh]
  );

  const resetStarEvents = useCallback(
    async (input: ResetStarEventsInput = {}) => {
      const classroomId = input.classroom_id || null;

      if (isDemoMode) {
        mutateDemo((current) => ({
          ...current,
          starEvents: classroomId ? current.starEvents.filter((event) => event.classroom_id !== classroomId) : []
        }));
        return;
      }

      if (isGuestMode) {
        throw new Error("ต้องเข้าสู่ระบบครูก่อนจึงจะล้างคะแนนดาวได้");
      }

      const query = getSupabaseBrowserClient().from("star_events").delete();
      const { error: deleteError } = classroomId ? await query.eq("classroom_id", classroomId) : await query.not("id", "is", null);
      if (deleteError) {
        const message = deleteError.message.toLowerCase();
        if (message.includes("permission denied") || message.includes("row-level security") || message.includes("rls")) {
          throw new Error("Supabase ยังไม่เปิดสิทธิ์ล้างดาว ให้รันไฟล์ supabase/fixes/002_allow_star_event_reset.sql ใน SQL Editor ก่อน");
        }
        throw deleteError;
      }
      await refresh();
    },
    [isDemoMode, isGuestMode, mutateDemo, refresh]
  );

  const resetDemoData = useCallback(() => {
    const demo = cloneSampleData();
    saveDemoData(demo);
    setData(demo);
  }, []);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      isDemoMode,
      isGuestMode,
      refresh,
      resetDemoData,
      addClassroom,
      updateClassroom,
      deleteClassroom,
      addStudent,
      updateStudent,
      addStudentPhotos,
      deleteStudentPhoto,
      setPrimaryStudentPhoto,
      deleteStudent,
      importStudents,
      importStudentRows,
      addGroup,
      updateGroup,
      deleteGroup,
      assignStudentToGroup,
      addSubject,
      updateSubject,
      deleteSubject,
      addStarEvent,
      addStudentStarEvents,
      addGroupMemberStarEvents,
      resetStarEvents,
      logRandom
    }),
    [
      addClassroom,
      addGroup,
      addGroupMemberStarEvents,
      addStarEvent,
      addStudentStarEvents,
      addStudent,
      addStudentPhotos,
      addSubject,
      assignStudentToGroup,
      data,
      deleteClassroom,
      deleteGroup,
      deleteStudent,
      deleteStudentPhoto,
      deleteSubject,
      error,
      importStudents,
      importStudentRows,
      isGuestMode,
      isDemoMode,
      loading,
      logRandom,
      refresh,
      resetStarEvents,
      resetDemoData,
      setPrimaryStudentPhoto,
      updateClassroom,
      updateGroup,
      updateStudent,
      updateSubject
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used inside DataProvider");
  }
  return context;
}
