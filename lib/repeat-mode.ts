export type RepeatMode = "unique" | "repeat";

export function repeatModeFromParam(value: string | null | undefined): RepeatMode {
  return value === "repeat" ? "repeat" : "unique";
}

export function isUniqueMode(mode: RepeatMode) {
  return mode === "unique";
}

export function nextPickedIds(current: string[], pickedIds: string[], total: number, uniqueMode: boolean) {
  if (!uniqueMode) return pickedIds;

  const combined = Array.from(new Set([...current, ...pickedIds]));
  return combined.length >= total ? pickedIds : combined;
}

export function excludedWhenUnique(current: string[], total: number, needed: number, uniqueMode: boolean) {
  if (!uniqueMode) return [];
  return total - current.length >= needed ? current : [];
}
