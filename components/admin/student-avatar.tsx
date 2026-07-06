import { cn } from "@/lib/utils";

const faces = ["🙂", "😄", "😊", "🤩", "😎", "🥰", "😁", "😃"];

export function StudentAvatar({
  name,
  photoUrl,
  size = "md",
  shape = "circle",
  className
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  shape?: "circle" | "rounded";
  className?: string;
}) {
  const sizeClass = {
    sm: "h-9 w-9 text-lg",
    md: "h-12 w-12 text-2xl",
    lg: "h-20 w-20 text-4xl",
    xl: "h-36 w-36 text-7xl",
    hero: "h-[300px] w-full max-w-[420px] text-8xl sm:h-[380px]"
  }[size];
  const shapeClass = shape === "rounded" ? "rounded-[2rem]" : "rounded-full";
  const face = faces[Math.abs(name.length) % faces.length];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(shapeClass, "border-4 border-white object-cover shadow-lg", sizeClass, className)}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cn(
        "grid place-items-center border-4 border-white bg-gradient-to-br from-amber-200 via-pink-200 to-sky-200 shadow-lg",
        shapeClass,
        sizeClass,
        className
      )}
    >
      {face}
    </div>
  );
}
