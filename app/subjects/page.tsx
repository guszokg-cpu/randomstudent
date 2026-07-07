"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextArea, TextInput } from "@/components/ui/fields";
import { PageCard } from "@/components/ui/page-card";
import { readTeachingSession, saveTeachingSession } from "@/lib/teaching-session";
import type { Subject, SubjectDraft } from "@/lib/types";
import { useData } from "@/components/providers/data-provider";

function createDraft(classroomId: string): SubjectDraft {
  return {
    name: "",
    classroom_id: classroomId,
    color: "#7c3aed",
    description: ""
  };
}

export default function SubjectsPage() {
  const { data, addSubject, updateSubject, deleteSubject } = useData();
  const firstClassroomId = data.classrooms[0]?.id ?? "";
  const [classroomId, setClassroomId] = useState("");
  const [draft, setDraft] = useState<SubjectDraft>(createDraft(firstClassroomId));
  const [editing, setEditing] = useState<Subject | null>(null);
  const subjects = useMemo(() => data.subjects.filter((subject) => subject.classroom_id === classroomId), [data.subjects, classroomId]);

  useEffect(() => {
    const saved = readTeachingSession();
    const savedClassroomId = saved?.classroomId ?? "";
    const next =
      (savedClassroomId && data.classrooms.some((classroom) => classroom.id === savedClassroomId) ? savedClassroomId : "") ||
      firstClassroomId;

    if (next && !classroomId) {
      setClassroomId(next);
      setDraft(createDraft(next));
    }
  }, [classroomId, data.classrooms, firstClassroomId]);

  function changeClassroom(next: string) {
    setClassroomId(next);
    setDraft(createDraft(next));
    setEditing(null);
    const saved = readTeachingSession();
    saveTeachingSession({
      classroomId: next,
      subjectId: "",
      activity: saved?.activity || "โจทย์ดาวนักคิด",
      repeatMode: saved?.repeatMode ?? "unique"
    });
  }

  function startEdit(subject: Subject) {
    setEditing(subject);
    setDraft({
      name: subject.name,
      classroom_id: subject.classroom_id,
      color: subject.color,
      description: subject.description
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    if (editing) {
      await updateSubject(editing.id, draft);
    } else {
      await addSubject(draft);
    }
    setEditing(null);
    setDraft(createDraft(classroomId));
  }

  async function handleDelete(subject: Subject) {
    if (!confirm(`ลบรายวิชา ${subject.name} หรือไม่? ประวัติดาวเดิมจะถูกเก็บแต่ไม่ผูกกับรายวิชานี้`)) return;
    await deleteSubject(subject.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-violet-600">จัดการข้อมูลหลัก</p>
        <h1 className="text-3xl font-black text-violet-950">หน้าจัดการรายวิชา</h1>
      </header>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <PageCard>
          <form className="space-y-3" onSubmit={onSubmit}>
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
            <div>
              <Label>ชื่อรายวิชา</Label>
              <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="คณิตศาสตร์ ป.4" />
            </div>
            <div>
              <Label>สีประจำวิชา</Label>
              <TextInput type="color" className="h-12 p-1" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
            </div>
            <div>
              <Label>คำอธิบาย</Label>
              <TextArea value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editing ? "บันทึกรายวิชา" : "+ เพิ่มรายวิชา"}</Button>
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
          {subjects.length === 0 ? (
            <EmptyState title="ยังไม่มีรายวิชาในห้องนี้" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {subjects.map((subject) => (
                <div key={subject.id} className="soft-card rounded-2xl p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 h-3 w-20 rounded-full" style={{ backgroundColor: subject.color }} />
                      <p className="text-lg font-black text-violet-950">{subject.name}</p>
                      <p className="text-sm font-semibold text-slate-500">{subject.description || "ไม่มีคำอธิบาย"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="light" onClick={() => startEdit(subject)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="danger" onClick={() => void handleDelete(subject)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </section>
    </div>
  );
}
