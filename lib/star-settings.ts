import type { StarSetting } from "@/lib/types";

export const STAR_SETTINGS: StarSetting[] = [
  { label: "ตอบถูก", reason: "ตอบถูก", stars: 1, tone: "green" },
  { label: "ยอดเยี่ยม", reason: "อธิบายเหตุผลดี", stars: 2, tone: "purple" },
  { label: "พยายามดี", reason: "พยายามดี", stars: 0.5, tone: "orange" },
  { label: "ช่วยเพื่อน", reason: "ช่วยเพื่อน", stars: 1, tone: "blue" },
  { label: "โจทย์ท้าทาย", reason: "ผ่านภารกิจท้าทาย", stars: 3, tone: "pink" }
];
