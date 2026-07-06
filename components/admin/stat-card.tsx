import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "violet",
  note
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "violet" | "sky" | "emerald" | "amber" | "rose";
  note?: string;
}) {
  const tones = {
    violet: "from-violet-500 to-fuchsia-500 text-white shadow-violet-700/25",
    sky: "from-sky-400 to-cyan-400 text-white shadow-sky-600/20",
    emerald: "from-emerald-400 to-teal-400 text-white shadow-emerald-600/20",
    amber: "from-amber-300 to-orange-400 text-slate-950 shadow-amber-500/20",
    rose: "from-rose-400 to-pink-500 text-white shadow-rose-600/20"
  };

  return (
    <div className="group soft-card relative overflow-hidden rounded-2xl p-4 transition duration-200 hover:-translate-y-1 hover:shadow-2xl">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200/25 blur-2xl transition group-hover:bg-pink-200/35" />
      <div className="relative flex items-start gap-4">
        <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br shadow-lg", tones[tone])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-500">{label}</p>
          <p className="mt-1 text-4xl font-black text-violet-950">{value}</p>
          {note ? <p className="mt-1 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}
