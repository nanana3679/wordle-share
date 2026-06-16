import type { ScriptId } from "@/lib/scripts/types";

export function formatGameUnit(unit: string, script: ScriptId): string {
  if (script === "latin") return unit.toUpperCase();
  return unit;
}
