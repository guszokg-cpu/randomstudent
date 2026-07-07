import { repeatModeFromParam, type RepeatMode } from "@/lib/repeat-mode";
import type { Classroom, Subject } from "@/lib/types";

const teachingSessionKey = "suum-sanuk-current-teaching-session-v1";

export type TeachingSession = {
  classroomId: string;
  subjectId: string;
  activity: string;
  repeatMode: RepeatMode;
  updatedAt: string;
};

export type TeachingSessionDraft = Omit<TeachingSession, "updatedAt">;

export function readTeachingSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(teachingSessionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TeachingSession>;
    if (!parsed.classroomId) return null;

    return {
      classroomId: parsed.classroomId,
      subjectId: parsed.subjectId ?? "",
      activity: parsed.activity?.trim() || "กิจกรรมดาวนักคิด",
      repeatMode: repeatModeFromParam(parsed.repeatMode),
      updatedAt: parsed.updatedAt ?? ""
    } satisfies TeachingSession;
  } catch {
    return null;
  }
}

export function saveTeachingSession(draft: TeachingSessionDraft) {
  const session: TeachingSession = {
    ...draft,
    activity: draft.activity.trim() || "กิจกรรมดาวนักคิด",
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(teachingSessionKey, JSON.stringify(session));
  }

  return session;
}

export function clearTeachingSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(teachingSessionKey);
  }
}

export function resolvePlaySession({
  classrooms,
  subjects,
  defaultActivity,
  defaultRepeatMode = "unique"
}: {
  classrooms: Classroom[];
  subjects: Subject[];
  defaultActivity: string;
  defaultRepeatMode?: RepeatMode;
}) {
  const saved = readTeachingSession();
  const query = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const queryClassroomId = query.get("classroom") ?? "";
  const savedClassroomId = saved?.classroomId ?? "";
  const firstClassroomId = classrooms[0]?.id ?? "";
  const classroomId =
    (queryClassroomId && classrooms.some((classroom) => classroom.id === queryClassroomId) ? queryClassroomId : "") ||
    (savedClassroomId && classrooms.some((classroom) => classroom.id === savedClassroomId) ? savedClassroomId : "") ||
    firstClassroomId;

  const querySubjectId = query.get("subject") ?? "";
  const savedSubjectId = saved?.subjectId ?? "";
  const subjectId =
    (querySubjectId && subjects.some((subject) => subject.id === querySubjectId && subject.classroom_id === classroomId) ? querySubjectId : "") ||
    (savedSubjectId && subjects.some((subject) => subject.id === savedSubjectId && subject.classroom_id === classroomId) ? savedSubjectId : "");

  return {
    classroomId,
    subjectId,
    activity: query.get("activity") || saved?.activity || defaultActivity,
    repeatMode: repeatModeFromParam(query.get("repeat") || saved?.repeatMode || defaultRepeatMode)
  };
}
