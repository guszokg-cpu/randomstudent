import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isToday(isoDate: string) {
  return isoDate.slice(0, 10) === todayKey();
}

export function formatStars(stars: number) {
  return Number.isInteger(stars) ? stars.toString() : stars.toFixed(1);
}

export function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function pickOne<T>(items: T[], excludedIds: string[] = [], getId?: (item: T) => string) {
  const pool = getId ? items.filter((item) => !excludedIds.includes(getId(item))) : items;
  const finalPool = pool.length > 0 ? pool : items;
  if (finalPool.length === 0) return null;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export function parseImportLines(lines: string, classroomId: string) {
  return lines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      const number = match ? Number(match[1]) : index + 1;
      const name = match ? match[2].trim() : line;
      const nickname = name.replace(/^(เด็กชาย|เด็กหญิง|นาย|นางสาว)\s*/u, "").split(/\s+/)[0] || name;

      return {
        student_code: `DEMO-${classroomId.slice(0, 4)}-${String(number).padStart(3, "0")}`,
        student_number: number,
        full_name: name,
        nickname,
        classroom_id: classroomId,
        group_id: null,
        profile_photo_mode: "random" as const,
        status: "active" as const
      };
    });
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
