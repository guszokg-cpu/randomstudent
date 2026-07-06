"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playRandomFinishSound, playRandomStartSound, stopRandomRollingSound } from "@/lib/sound-effects";

export const RANDOM_DRAW_DURATION_MS = 5000;

type DrawOptions<T> = {
  pool: T[];
  winner: T;
  getId: (item: T) => string;
  durationMs?: number;
  intervalMs?: number;
  trailSize?: number;
  onFinish: () => void;
};

export function useDramaticDraw<T>() {
  const [isRolling, setIsRolling] = useState(false);
  const [preview, setPreview] = useState<T | null>(null);
  const [trail, setTrail] = useState<T[]>([]);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopRandomRollingSound();
  }, []);

  const start = useCallback(
    ({ pool, winner, getId, durationMs = RANDOM_DRAW_DURATION_MS, intervalMs = 70, trailSize = 7, onFinish }: DrawOptions<T>) => {
      if (pool.length === 0) return;
      clearTimers();
      setIsRolling(true);
      setPreview(pool[Math.floor(Math.random() * pool.length)] ?? winner);
      setTrail([]);
      playRandomStartSound(durationMs);

      intervalRef.current = window.setInterval(() => {
        const next = pool[Math.floor(Math.random() * pool.length)] ?? winner;
        setPreview(next);
        setTrail((current) => {
          const nextId = getId(next);
          return [next, ...current.filter((item) => getId(item) !== nextId)].slice(0, trailSize);
        });
      }, intervalMs);

      timeoutRef.current = window.setTimeout(() => {
        clearTimers();
        setPreview(winner);
        setTrail((current) => [winner, ...current.filter((item) => getId(item) !== getId(winner))].slice(0, trailSize));
        setIsRolling(false);
        playRandomFinishSound();
        onFinish();
      }, durationMs);
    },
    [clearTimers]
  );

  const reset = useCallback(() => {
    clearTimers();
    setIsRolling(false);
    setPreview(null);
    setTrail([]);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { isRolling, preview, trail, start, reset };
}
