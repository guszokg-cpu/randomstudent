"use client";

import { useEffect } from "react";
import { playSoundEffect, preloadSoundEffects } from "@/lib/sound-effects";

const clickSelector = [
  "[data-sound='click']",
  "a[href]",
  "button",
  "select",
  "input[type='checkbox']",
  "input[type='radio']",
  "[role='button']"
].join(",");

export function SoundEffectsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    preloadSoundEffects();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-sound='off']")) return;
      if (target.closest("button:disabled,[aria-disabled='true']")) return;

      if (target.closest("[data-sound='menu']")) {
        playSoundEffect("menu");
        return;
      }

      if (target.closest(clickSelector)) {
        playSoundEffect("click");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, []);

  return <>{children}</>;
}
