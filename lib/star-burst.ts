"use client";

export const STAR_AWARD_BURST_EVENT = "suum-sanuk-star-award-burst";

export type StarAwardBurstDetail = {
  id: number;
  stars: number;
  reason: string;
  recipientName: string;
  recipientDetail?: string;
  eventType: "student" | "group";
};

export function dispatchStarAwardBurst(detail: Omit<StarAwardBurstDetail, "id">) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<StarAwardBurstDetail>(STAR_AWARD_BURST_EVENT, {
      detail: {
        ...detail,
        id: Date.now()
      }
    })
  );
}
