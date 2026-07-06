import type { Classroom, DataBundle, Group, StarEvent, Student, StudentPhoto } from "@/lib/types";
import { isToday } from "@/lib/utils";

export function classroomStudents(students: Student[], classroomId: string) {
  return students
    .filter((student) => student.classroom_id === classroomId && student.status === "active")
    .sort((a, b) => a.student_number - b.student_number);
}

export function classroomGroups(groups: Group[], classroomId: string) {
  return groups.filter((group) => group.classroom_id === classroomId);
}

export function sumStudentStars(events: StarEvent[], studentId: string, subjectId?: string | null) {
  return events
    .filter((event) => event.student_id === studentId)
    .filter((event) => !subjectId || event.subject_id === subjectId)
    .reduce((sum, event) => sum + Number(event.stars), 0);
}

export function sumGroupStars(events: StarEvent[], groupId: string, subjectId?: string | null) {
  return events
    .filter((event) => event.group_id === groupId)
    .filter((event) => !subjectId || event.subject_id === subjectId)
    .reduce((sum, event) => sum + Number(event.stars), 0);
}

export function sumCurrentGroupMemberStars(events: StarEvent[], students: Student[], groupId: string, subjectId?: string | null) {
  const memberIds = new Set(students.filter((student) => student.group_id === groupId && student.status === "active").map((student) => student.id));
  return events
    .filter((event) => event.student_id && memberIds.has(event.student_id))
    .filter((event) => !subjectId || event.subject_id === subjectId)
    .reduce((sum, event) => sum + Number(event.stars), 0);
}

export function todayStars(events: StarEvent[]) {
  return events.filter((event) => isToday(event.created_at)).reduce((sum, event) => sum + Number(event.stars), 0);
}

export function studentGroup(groups: Group[], student: Student) {
  return groups.find((group) => group.id === student.group_id) ?? null;
}

export function studentPhotoGallery(photos: StudentPhoto[], student: Student) {
  const gallery = photos
    .filter((photo) => photo.student_id === student.id)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  if (gallery.length > 0) return gallery;
  if (!student.photo_url) return [];

  return [
    {
      id: `${student.id}-legacy-photo`,
      student_id: student.id,
      photo_url: student.photo_url,
      sort_order: 0,
      is_primary: true,
      created_at: student.created_at
    }
  ];
}

export function primaryStudentPhoto(photos: StudentPhoto[], student: Student) {
  return studentPhotoGallery(photos, student)[0]?.photo_url ?? student.photo_url ?? null;
}

export function randomStudentPhoto(photos: StudentPhoto[], student: Student) {
  if (student.profile_photo_mode === "locked") {
    return primaryStudentPhoto(photos, student);
  }

  const gallery = studentPhotoGallery(photos, student);
  if (gallery.length === 0) return null;
  return gallery[Math.floor(Math.random() * gallery.length)].photo_url;
}

export function topStudents(bundle: DataBundle, classroomId?: string, subjectId?: string | null, limit = 5) {
  return bundle.students
    .filter((student) => student.status === "active")
    .filter((student) => !classroomId || student.classroom_id === classroomId)
    .map((student) => ({
      student,
      stars: sumStudentStars(bundle.starEvents, student.id, subjectId)
    }))
    .sort((a, b) => b.stars - a.stars || a.student.student_number - b.student.student_number)
    .slice(0, limit);
}

export function topGroups(bundle: DataBundle, classroomId?: string, subjectId?: string | null, limit = 5) {
  return bundle.groups
    .filter((group) => !classroomId || group.classroom_id === classroomId)
    .map((group) => ({
      group,
      stars: sumCurrentGroupMemberStars(bundle.starEvents, bundle.students, group.id, subjectId)
    }))
    .sort((a, b) => b.stars - a.stars || a.group.name.localeCompare(b.group.name, "th"))
    .slice(0, limit);
}

export function classroomName(classrooms: Classroom[], classroomId: string) {
  return classrooms.find((classroom) => classroom.id === classroomId)?.name ?? "-";
}

export function randomCountForStudent(bundle: DataBundle, studentId: string) {
  return bundle.randomLogs.filter((log) => log.student_id === studentId).length;
}
