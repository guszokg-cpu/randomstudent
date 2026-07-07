export type Status = "active" | "inactive";
export type ProfilePhotoMode = "random" | "locked";

export type RandomMode =
  | "individual"
  | "group"
  | "group-representative"
  | "battle"
  | "battle-student"
  | "helper"
  | "boss";

export type StarEventType = "student" | "group";

export type Classroom = {
  id: string;
  name: string;
  grade_level: string;
  academic_year: string;
  image_url: string | null;
  status: Status;
  created_at: string;
};

export type Student = {
  id: string;
  student_code: string;
  student_number: number;
  full_name: string;
  nickname: string;
  classroom_id: string;
  group_id: string | null;
  photo_url: string | null;
  profile_photo_mode: ProfilePhotoMode;
  status: Status;
  created_at: string;
};

export type StudentDraft = Omit<Student, "id" | "created_at" | "photo_url"> & {
  photo_url?: string | null;
};

export type StudentPhoto = {
  id: string;
  student_id: string;
  photo_url: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type ClassroomDraft = Omit<Classroom, "id" | "created_at">;

export type Group = {
  id: string;
  classroom_id: string;
  name: string;
  color: string;
  icon_url: string | null;
  created_at: string;
};

export type GroupDraft = Omit<Group, "id" | "created_at" | "icon_url"> & {
  icon_url?: string | null;
};

export type Subject = {
  id: string;
  name: string;
  classroom_id: string;
  color: string;
  description: string | null;
  created_at: string;
};

export type SubjectDraft = Omit<Subject, "id" | "created_at">;

export type StarEvent = {
  id: string;
  student_id: string | null;
  group_id: string | null;
  classroom_id: string;
  subject_id: string | null;
  activity_name: string;
  reason: string;
  stars: number;
  event_type: StarEventType;
  created_at: string;
};

export type RandomLog = {
  id: string;
  classroom_id: string;
  subject_id: string | null;
  student_id: string | null;
  group_id: string | null;
  mode: RandomMode;
  created_at: string;
};

export type StarSetting = {
  label: string;
  reason: string;
  stars: number;
  tone: "green" | "purple" | "orange" | "pink" | "blue";
};

export type DataBundle = {
  classrooms: Classroom[];
  students: Student[];
  studentPhotos: StudentPhoto[];
  groups: Group[];
  subjects: Subject[];
  starEvents: StarEvent[];
  randomLogs: RandomLog[];
};

export type StudentScoreLookup = {
  student_id: string;
  full_name: string;
  nickname: string;
  photo_url: string | null;
  classroom_name: string;
  group_name: string | null;
  total_stars: number;
  today_stars: number;
  subject_stars: Array<{ subject_name: string; stars: number }>;
  recent_events: Array<{
    activity_name: string;
    reason: string;
    stars: number;
    created_at: string;
  }>;
};
