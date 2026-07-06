import type { Group, Status, Student, StudentDraft } from "@/lib/types";

export type StudentImportRow = {
  rowNumber: number;
  student_id: string;
  student_code: string;
  student_number: number | null;
  full_name: string;
  nickname: string;
  group_name: string;
  group_id: string;
  status: Status | "";
};

export type StudentImportOperation =
  | {
      type: "update";
      id: string;
      draft: StudentDraft;
      originalStudent: Student;
      rowNumber: number;
    }
  | {
      type: "create";
      draft: StudentDraft;
      rowNumber: number;
    };

export type StudentImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export const STUDENT_EXCEL_HEADERS = [
  { key: "student_id", label: "student_id (ห้ามแก้)", hidden: true },
  { key: "student_code", label: "เลขประจำตัวนักเรียน" },
  { key: "student_number", label: "เลขที่" },
  { key: "full_name", label: "ชื่อ-สกุล" },
  { key: "nickname", label: "ชื่อเล่น" },
  { key: "group_name", label: "กลุ่ม" },
  { key: "group_id", label: "group_id (ไม่ต้องแก้)", hidden: true },
  { key: "status", label: "สถานะ" }
] as const;

export type StudentExcelKey = (typeof STUDENT_EXCEL_HEADERS)[number]["key"];

function normalizeStatus(value: string, fallback: Status = "active"): Status | "" {
  const clean = value.trim().toLowerCase();
  if (!clean) return fallback;
  if (["active", "เปิดใช้งาน", "ใช้งาน", "ปกติ"].includes(clean)) return "active";
  if (["inactive", "ปิดใช้งาน", "พัก", "ย้าย", "ไม่ใช้งาน"].includes(clean)) return "inactive";
  return "";
}

function deriveNickname(fullName: string) {
  return fullName.replace(/^(เด็กชาย|เด็กหญิง|นาย|นางสาว)\s*/u, "").split(/\s+/)[0] || fullName;
}

function makeGeneratedStudentCode(classroomId: string, studentNumber: number, existingCodes: Set<string>) {
  const prefix = `S-${classroomId.slice(0, 4)}-${String(studentNumber).padStart(3, "0")}`;
  if (!existingCodes.has(prefix)) return prefix;

  let suffix = 2;
  while (existingCodes.has(`${prefix}-${suffix}`)) suffix += 1;
  return `${prefix}-${suffix}`;
}

function groupIdForRow(row: StudentImportRow, groups: Group[]) {
  const groupId = row.group_id.trim();
  const groupName = row.group_name.trim();

  if (groupName) {
    return groups.find((group) => group.name.trim() === groupName)?.id ?? null;
  }

  if (groupId) {
    return groups.some((group) => group.id === groupId) ? groupId : null;
  }

  return null;
}

export function prepareStudentImportOperations({
  classroomId,
  rows,
  students,
  groups
}: {
  classroomId: string;
  rows: StudentImportRow[];
  students: Student[];
  groups: Group[];
}): { operations: StudentImportOperation[]; errors: string[]; skipped: number } {
  const errors: string[] = [];
  let skipped = 0;
  const classroomStudents = students.filter((student) => student.classroom_id === classroomId);
  const existingById = new Map(classroomStudents.map((student) => [student.id, student]));
  const existingByCode = new Map(students.map((student) => [student.student_code.trim(), student]));
  const allCodes = new Set(students.map((student) => student.student_code.trim()).filter(Boolean));
  const operations: StudentImportOperation[] = [];

  rows.forEach((row) => {
    const hasContent = Boolean(row.student_id || row.student_code || row.student_number || row.full_name || row.nickname || row.group_name);
    if (!hasContent) {
      skipped += 1;
      return;
    }

    if (!row.full_name.trim()) {
      errors.push(`แถว ${row.rowNumber}: กรุณาใส่ชื่อ-สกุล`);
      return;
    }

    if (!row.student_number || row.student_number < 1) {
      errors.push(`แถว ${row.rowNumber}: เลขที่ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป`);
      return;
    }

    const byId = row.student_id ? existingById.get(row.student_id.trim()) : undefined;
    const byCode = row.student_code ? existingByCode.get(row.student_code.trim()) : undefined;
    const original = byId ?? (byCode?.classroom_id === classroomId ? byCode : undefined);

    if (row.student_id && !byId) {
      errors.push(`แถว ${row.rowNumber}: student_id ไม่ตรงกับนักเรียนในห้องนี้`);
      return;
    }

    if (byCode && byCode.classroom_id !== classroomId && byCode.id !== original?.id) {
      errors.push(`แถว ${row.rowNumber}: เลขประจำตัว ${row.student_code} ถูกใช้ในห้องอื่นแล้ว`);
      return;
    }

    const status = normalizeStatus(row.status, original?.status ?? "active");
    if (!status) {
      errors.push(`แถว ${row.rowNumber}: สถานะต้องเป็น active หรือ inactive`);
      return;
    }

    const groupId = groupIdForRow(row, groups);
    if ((row.group_name.trim() || row.group_id.trim()) && !groupId) {
      errors.push(`แถว ${row.rowNumber}: ไม่พบกลุ่ม "${row.group_name || row.group_id}" ในห้องนี้`);
      return;
    }

    const studentCode =
      row.student_code.trim() ||
      original?.student_code ||
      makeGeneratedStudentCode(classroomId, row.student_number, allCodes);
    allCodes.add(studentCode);

    const draft: StudentDraft = {
      student_code: studentCode,
      student_number: row.student_number,
      full_name: row.full_name.trim(),
      nickname: row.nickname.trim() || deriveNickname(row.full_name.trim()),
      classroom_id: classroomId,
      group_id: groupId,
      profile_photo_mode: original?.profile_photo_mode ?? "random",
      status
    };

    if (original) {
      operations.push({ type: "update", id: original.id, originalStudent: original, draft, rowNumber: row.rowNumber });
    } else {
      operations.push({ type: "create", draft, rowNumber: row.rowNumber });
    }
  });

  const finalClassroomStudents = new Map<string, { id: string; rowNumber: number; number: number; code: string }>();

  classroomStudents.forEach((student) => {
    finalClassroomStudents.set(student.id, {
      id: student.id,
      rowNumber: 0,
      number: student.student_number,
      code: student.student_code
    });
  });

  operations.forEach((operation, index) => {
    const key = operation.type === "update" ? operation.id : `new-${index}`;
    finalClassroomStudents.set(key, {
      id: key,
      rowNumber: operation.rowNumber,
      number: operation.draft.student_number,
      code: operation.draft.student_code
    });
  });

  const numberOwners = new Map<number, Array<{ id: string; rowNumber: number }>>();
  finalClassroomStudents.forEach((student) => {
    const owners = numberOwners.get(student.number) ?? [];
    owners.push({ id: student.id, rowNumber: student.rowNumber });
    numberOwners.set(student.number, owners);
  });

  numberOwners.forEach((owners, number) => {
    if (owners.length > 1) {
      const rows = owners.map((owner) => (owner.rowNumber ? `แถว ${owner.rowNumber}` : "ข้อมูลเดิม")).join(", ");
      errors.push(`เลขที่ ${number} ซ้ำกัน (${rows})`);
    }
  });

  const codeOwners = new Map<string, Array<{ id: string; rowNumber: number }>>();
  students.forEach((student) => {
    codeOwners.set(student.student_code, [{ id: student.id, rowNumber: 0 }]);
  });
  operations.forEach((operation, index) => {
    const key = operation.type === "update" ? operation.id : `new-${index}`;
    const existing = (codeOwners.get(operation.draft.student_code) ?? []).filter((owner) => owner.id !== key);
    existing.push({ id: key, rowNumber: operation.rowNumber });
    codeOwners.set(operation.draft.student_code, existing);
  });

  codeOwners.forEach((owners, code) => {
    const uniqueIds = new Set(owners.map((owner) => owner.id));
    if (code && uniqueIds.size > 1) {
      const rows = owners.map((owner) => (owner.rowNumber ? `แถว ${owner.rowNumber}` : "ข้อมูลเดิม")).join(", ");
      errors.push(`เลขประจำตัว ${code} ซ้ำกัน (${rows})`);
    }
  });

  return { operations, errors, skipped };
}
