import type { DataBundle } from "@/lib/types";

const createdAt = "2026-05-01T08:00:00.000Z";

export const sampleData: DataBundle = {
  classrooms: [
    {
      id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      name: "ป.4/1",
      grade_level: "ป.4",
      academic_year: "2569",
      image_url: null,
      status: "active",
      created_at: createdAt
    },
    {
      id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc002",
      name: "ป.5/1",
      grade_level: "ป.5",
      academic_year: "2569",
      image_url: null,
      status: "active",
      created_at: createdAt
    },
    {
      id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc003",
      name: "ป.6/1",
      grade_level: "ป.6",
      academic_year: "2569",
      image_url: null,
      status: "active",
      created_at: createdAt
    }
  ],
  groups: [
    {
      id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc101",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      name: "ดาวเหนือ",
      color: "#38bdf8",
      icon_url: null,
      created_at: createdAt
    },
    {
      id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc102",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      name: "สายฟ้า",
      color: "#f59e0b",
      icon_url: null,
      created_at: createdAt
    },
    {
      id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc103",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      name: "จรวดน้อย",
      color: "#ef4444",
      icon_url: null,
      created_at: createdAt
    },
    {
      id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc104",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      name: "นักคิดพิชิตโจทย์",
      color: "#ec4899",
      icon_url: null,
      created_at: createdAt
    }
  ],
  students: [
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc201",
      student_code: "S2569-401-001",
      student_number: 1,
      full_name: "เด็กชายก้องภพ ศรีสุข",
      nickname: "ก้อง",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc101",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    },
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc202",
      student_code: "S2569-401-002",
      student_number: 2,
      full_name: "เด็กหญิงแพรวพราว ใจดี",
      nickname: "แพรว",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc101",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    },
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc203",
      student_code: "S2569-401-003",
      student_number: 3,
      full_name: "เด็กชายบอลลภ เก่งกล้า",
      nickname: "บอล",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc102",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    },
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc204",
      student_code: "S2569-401-004",
      student_number: 4,
      full_name: "เด็กหญิงฟ้าใส น่ารัก",
      nickname: "ฟ้าใส",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc102",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    },
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc205",
      student_code: "S2569-401-005",
      student_number: 5,
      full_name: "เด็กชายต้นน้ำ มีสุข",
      nickname: "ต้นน้ำ",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc103",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    },
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc206",
      student_code: "S2569-401-006",
      student_number: 6,
      full_name: "เด็กหญิงออมสิน ตั้งใจ",
      nickname: "ออมสิน",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc103",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    },
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc207",
      student_code: "S2569-401-007",
      student_number: 7,
      full_name: "เด็กชายภูผา แก้วใจ",
      nickname: "ภูผา",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc104",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    },
    {
      id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc208",
      student_code: "S2569-401-008",
      student_number: 8,
      full_name: "เด็กหญิงมะลิ สดใส",
      nickname: "มะลิ",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc104",
      photo_url: null,
      profile_photo_mode: "random",
      status: "active",
      created_at: createdAt
    }
  ],
  studentPhotos: [],
  subjects: [
    {
      id: "2a11a8ad-6a1b-4d9f-94ab-1db4f35cc301",
      name: "คณิตศาสตร์ ป.4",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      color: "#7c3aed",
      description: "กิจกรรมคิดเลขและแก้โจทย์ปัญหา",
      created_at: createdAt
    },
    {
      id: "2a11a8ad-6a1b-4d9f-94ab-1db4f35cc302",
      name: "ภาษาไทย ป.4",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      color: "#0ea5e9",
      description: "อ่าน เขียน และสื่อสาร",
      created_at: createdAt
    }
  ],
  starEvents: [
    {
      id: "3a11a8ad-6a1b-4d9f-94ab-1db4f35cc401",
      student_id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc201",
      group_id: null,
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      subject_id: "2a11a8ad-6a1b-4d9f-94ab-1db4f35cc301",
      activity_name: "โจทย์ดาวนักคิด",
      reason: "ตอบถูก",
      stars: 7,
      event_type: "student",
      created_at: new Date().toISOString()
    },
    {
      id: "3a11a8ad-6a1b-4d9f-94ab-1db4f35cc402",
      student_id: "1a11a8ad-6a1b-4d9f-94ab-1db4f35cc202",
      group_id: null,
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      subject_id: "2a11a8ad-6a1b-4d9f-94ab-1db4f35cc301",
      activity_name: "โจทย์ดาวนักคิด",
      reason: "อธิบายเหตุผลดี",
      stars: 5,
      event_type: "student",
      created_at: new Date().toISOString()
    },
    {
      id: "3a11a8ad-6a1b-4d9f-94ab-1db4f35cc403",
      student_id: null,
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc101",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      subject_id: "2a11a8ad-6a1b-4d9f-94ab-1db4f35cc301",
      activity_name: "ตอบเร็วทั้งทีม",
      reason: "ให้ดาวกลุ่ม",
      stars: 25,
      event_type: "group",
      created_at: new Date().toISOString()
    },
    {
      id: "3a11a8ad-6a1b-4d9f-94ab-1db4f35cc404",
      student_id: null,
      group_id: "9a11a8ad-6a1b-4d9f-94ab-1db4f35cc102",
      classroom_id: "8a11a8ad-6a1b-4d9f-94ab-1db4f35cc001",
      subject_id: "2a11a8ad-6a1b-4d9f-94ab-1db4f35cc301",
      activity_name: "ตอบเร็วทั้งทีม",
      reason: "ให้ดาวกลุ่ม",
      stars: 22,
      event_type: "group",
      created_at: new Date().toISOString()
    }
  ],
  randomLogs: []
};
