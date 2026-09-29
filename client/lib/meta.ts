// Display metadata for the states the page shows. Tones name theme roles;
// `toneColor` maps them onto the active Paseo theme.
import type { PluginTheme } from "@getpaseo/plugin";
import type { CellState, UpdateState } from "./types";

export type Tone = "success" | "primary" | "warning" | "attention" | "danger" | "muted" | "none";

export interface StateMeta {
  label: string;
  title: string;
  tone: Tone;
}

/** Add an alpha channel to a #rrggbb colour; other formats pass through unchanged. */
export function alpha(color: string, amount: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  return `${color}${Math.round(Math.max(0, Math.min(1, amount)) * 255).toString(16).padStart(2, "0")}`;
}

export function toneColor(theme: PluginTheme, tone: Tone): string {
  const { colors } = theme;
  switch (tone) {
    case "success":
      return colors.statusSuccess;
    case "primary":
      return colors.accent;
    case "warning":
      return colors.statusWarning;
    // Paseo has no fourth status hue; a lighter warning keeps "attention" distinct from "drifted".
    case "attention":
      return alpha(colors.statusWarning, 0.55);
    case "danger":
      return colors.statusDanger;
    case "muted":
      return colors.foregroundMuted;
    case "none":
      return "transparent";
  }
}

export const CELL_META: Record<CellState, StateMeta> = {
  linked: { label: "linked", title: "Linked to the hub", tone: "success" },
  same: { label: "copy", title: "Identical copy of the hub", tone: "primary" },
  modified: { label: "modified", title: "Copy differs from the hub", tone: "warning" },
  unmanaged: { label: "unmanaged", title: "Only here; not in the hub", tone: "muted" },
  "external-link": { label: "external", title: "Link to somewhere else", tone: "attention" },
  broken: { label: "broken", title: "Dangling link or no SKILL.md", tone: "danger" },
  missing: { label: "missing", title: "Not installed", tone: "none" },
  hub: { label: "via hub", title: "Reads it from the hub; no link needed", tone: "success" },
};

export const UPDATE_META: Record<UpdateState, StateMeta> = {
  "up-to-date": { label: "up to date", title: "Matches the source", tone: "success" },
  "update-available": { label: "update", title: "The source has a newer version", tone: "primary" },
  modified: { label: "edited", title: "Edited locally; source unchanged", tone: "warning" },
  "modified-and-update": { label: "edited + update", title: "Edited locally and the source changed", tone: "attention" },
  untracked: { label: "no source", title: "Origin unknown", tone: "muted" },
  error: { label: "check failed", title: "Could not reach the source", tone: "danger" },
};

export function isDrifted(state: CellState): boolean {
  return state === "modified" || state === "external-link" || state === "broken";
}
