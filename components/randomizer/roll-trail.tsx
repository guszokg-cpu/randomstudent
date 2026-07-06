import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function RollTrail({
  labels,
  active,
  finalLabel,
  className
}: {
  labels: string[];
  active: boolean;
  finalLabel?: string;
  className?: string;
}) {
  if (!active && !finalLabel) return null;

  return (
    <div className={cn("mt-5 rounded-2xl bg-violet-950/90 p-3 text-white shadow-inner", className)}>
      <div className="mb-2 flex items-center justify-center gap-2 text-sm font-black text-amber-200">
        <Sparkles className={cn("h-4 w-4", active ? "sparkle" : "")} />
        {active ? "กำลังหมุนรายชื่อ..." : "หยุดที่ชื่อนี้!"}
      </div>
      <div className="roll-ticker">
        {(active ? labels : finalLabel ? [finalLabel] : labels).map((label, index) => (
          <span key={`${label}-${index}`} className={cn("roll-chip", index === 0 ? "roll-chip-current" : "")}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
