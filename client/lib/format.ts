import type { Status } from "./types";

/** Recover the home directory from the hub path so we can shorten paths. Handles `/` and `\`. */
export function homeOf(status: Pick<Status, "hub">): string {
  const match = /^(.*)[\\/]\.agents[\\/]skills$/.exec(status.hub);
  return match !== null ? match[1] : "";
}

export function tildify(absolute: string, home: string): string {
  if (home === "") return absolute;
  const rest = absolute.slice(home.length);
  return absolute.startsWith(home) && (rest.startsWith("/") || rest.startsWith("\\")) ? `~${rest}` : absolute;
}

export function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

export function timeAgo(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
