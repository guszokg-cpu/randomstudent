import { Rocket, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function GroupIcon({
  name,
  color,
  iconUrl,
  size = "md"
}: {
  name: string;
  color: string;
  iconUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-28 w-28"
  }[size];

  if (iconUrl) {
    return <img src={iconUrl} alt={name} className={cn(sizeClass, "rounded-2xl object-cover shadow-lg")} />;
  }

  const isRocket = name.includes("จรวด") || name.includes("ท้าทาย");

  return (
    <div
      className={cn("grid place-items-center rounded-2xl border-4 border-white text-white shadow-lg", sizeClass)}
      style={{ background: `linear-gradient(135deg, ${color}, #7c3aed)` }}
    >
      {isRocket ? <Rocket className="h-1/2 w-1/2" /> : <Star className="h-1/2 w-1/2 fill-current" />}
    </div>
  );
}
