"use client";

import { Repeat, ShieldCheck } from "lucide-react";
import type { RepeatMode } from "@/lib/repeat-mode";
import { cn } from "@/lib/utils";

export function RepeatModeControl({
  mode,
  onChange,
  disabled = false,
  className
}: {
  mode: RepeatMode;
  onChange: (mode: RepeatMode) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-2xl bg-white/15 p-1 shadow-lg backdrop-blur", className)} aria-label="เลือกรูปแบบการสุ่มซ้ำ">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("unique")}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition disabled:opacity-60",
          mode === "unique" ? "bg-white text-violet-800" : "text-white hover:bg-white/10"
        )}
      >
        <ShieldCheck className="h-4 w-4" />
        ไม่ซ้ำจนกว่าจะครบ
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("repeat")}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition disabled:opacity-60",
          mode === "repeat" ? "bg-white text-violet-800" : "text-white hover:bg-white/10"
        )}
      >
        <Repeat className="h-4 w-4" />
        ซ้ำได้ทุกครั้ง
      </button>
    </div>
  );
}
