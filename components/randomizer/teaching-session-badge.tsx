import { DoorOpen, Sparkles } from "lucide-react";
import { RepeatMode } from "@/lib/repeat-mode";
import type { Classroom, Subject } from "@/lib/types";

export function TeachingSessionBadge({
  classroom,
  subject,
  activity,
  repeatMode
}: {
  classroom?: Classroom | null;
  subject?: Subject | null;
  activity: string;
  repeatMode?: RepeatMode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-white/15 bg-white/12 px-3 py-2 text-sm font-black text-white shadow-lg shadow-violet-950/20 backdrop-blur">
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1.5 text-violet-950">
        <DoorOpen className="h-4 w-4" />
        {classroom ? `กำลังเล่นห้อง ${classroom.name}` : "ยังไม่ได้เลือกห้อง"}
      </span>
      {subject ? <span className="rounded-full bg-white/14 px-3 py-1.5 text-violet-50">{subject.name}</span> : null}
      <span className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-violet-50">
        <Sparkles className="h-4 w-4 text-amber-200" />
        {activity || "กิจกรรมดาวนักคิด"}
      </span>
      {repeatMode ? (
        <span className="rounded-full bg-white/14 px-3 py-1.5 text-violet-50">
          {repeatMode === "unique" ? "สุ่มไม่ซ้ำ" : "ซ้ำได้ทุกครั้ง"}
        </span>
      ) : null}
    </div>
  );
}
