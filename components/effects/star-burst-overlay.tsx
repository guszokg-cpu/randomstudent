"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { STAR_AWARD_BURST_EVENT, type StarAwardBurstDetail } from "@/lib/star-burst";
import { cn, formatStars } from "@/lib/utils";

const particles = [
  { x: "-15rem", y: "-7rem", scale: 1.45, rotation: "-28deg", delay: "0ms" },
  { x: "-10rem", y: "6rem", scale: 1.05, rotation: "34deg", delay: "70ms" },
  { x: "-5rem", y: "-11rem", scale: 0.95, rotation: "-45deg", delay: "30ms" },
  { x: "0rem", y: "-8rem", scale: 1.2, rotation: "20deg", delay: "90ms" },
  { x: "6rem", y: "-10rem", scale: 0.9, rotation: "42deg", delay: "20ms" },
  { x: "11rem", y: "5rem", scale: 1.25, rotation: "-32deg", delay: "55ms" },
  { x: "15rem", y: "-5rem", scale: 1.55, rotation: "25deg", delay: "15ms" },
  { x: "4rem", y: "9rem", scale: 0.85, rotation: "-18deg", delay: "105ms" },
  { x: "-13rem", y: "0rem", scale: 0.8, rotation: "54deg", delay: "130ms" },
  { x: "13rem", y: "0rem", scale: 0.78, rotation: "-54deg", delay: "120ms" }
];

function toneForStars(stars: number) {
  if (stars >= 2) {
    return {
      card: "from-violet-700 via-fuchsia-600 to-pink-500",
      chip: "bg-white/20 text-white",
      glow: "shadow-fuchsia-500/40"
    };
  }

  if (stars < 1) {
    return {
      card: "from-amber-400 via-orange-400 to-pink-400",
      chip: "bg-white/24 text-violet-950",
      glow: "shadow-amber-400/45"
    };
  }

  return {
    card: "from-emerald-500 via-teal-500 to-sky-500",
    chip: "bg-white/22 text-white",
    glow: "shadow-emerald-400/40"
  };
}

export function StarBurstOverlay() {
  const [burst, setBurst] = useState<StarAwardBurstDetail | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function handleBurst(event: Event) {
      const burstEvent = event as CustomEvent<StarAwardBurstDetail>;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      setBurst(burstEvent.detail);
      timerRef.current = window.setTimeout(() => {
        setBurst(null);
        timerRef.current = null;
      }, 1350);
    }

    window.addEventListener(STAR_AWARD_BURST_EVENT, handleBurst);
    return () => {
      window.removeEventListener(STAR_AWARD_BURST_EVENT, handleBurst);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!burst) return null;

  const tone = toneForStars(burst.stars);

  return (
    <div className="star-burst-layer pointer-events-none fixed inset-0 z-[9999] grid place-items-center px-4">
      <div className="absolute inset-0 bg-violet-950/10 backdrop-blur-[1px]" />
      <section
        key={burst.id}
        className={cn(
          "star-burst-card relative grid w-full max-w-3xl place-items-center overflow-visible rounded-[2rem] bg-gradient-to-br p-6 text-center text-white shadow-2xl sm:p-9",
          tone.card,
          tone.glow
        )}
      >
        <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.36),transparent_12rem)]" />
        <div className="star-burst-halo absolute inset-[-3rem] rounded-full bg-amber-300/25 blur-3xl" />

        {particles.map((particle, index) => (
          <span
            key={`${burst.id}-${index}`}
            className="star-burst-particle absolute left-1/2 top-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-amber-200 drop-shadow-lg sm:h-12 sm:w-12"
            style={
              {
                "--burst-x": particle.x,
                "--burst-y": particle.y,
                "--burst-scale": particle.scale,
                "--burst-rotation": particle.rotation,
                "--burst-delay": particle.delay
              } as CSSProperties
            }
          >
            <Star className="h-7 w-7 fill-amber-300 text-amber-300 sm:h-8 sm:w-8" />
          </span>
        ))}

        <div className="relative z-10">
          <p className={cn("mx-auto mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-black shadow-sm", tone.chip)}>
            <Star className="h-5 w-5 fill-amber-300 text-amber-300" />
            ให้ดาวแล้ว!
          </p>
          <p className="text-[clamp(4rem,13vw,8.5rem)] font-black leading-none tracking-normal text-white drop-shadow-[0_10px_22px_rgba(40,20,100,.28)]">
            +{formatStars(burst.stars)}
            <span className="ml-3 text-[0.34em] align-middle text-amber-200">ดาว</span>
          </p>
          <p className="mt-2 text-[clamp(2rem,5vw,4.4rem)] font-black leading-tight text-white">{burst.recipientName}</p>
          {burst.recipientDetail ? <p className="mt-1 text-xl font-bold text-white/85 sm:text-2xl">{burst.recipientDetail}</p> : null}
          <p className="mt-4 inline-flex rounded-2xl bg-white/18 px-4 py-2 text-base font-extrabold text-white/90 sm:text-lg">{burst.reason}</p>
        </div>
      </section>
    </div>
  );
}
