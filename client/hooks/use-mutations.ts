// Every write the page can perform, wrapped with busy state, a toast summary,
// and a refetch. Components call these and never touch RPC directly.
import { useToast } from "@getpaseo/plugin/client/react-native";
import { useCallback, useMemo, useState } from "react";
import { describeError } from "../lib/format";
import type { Api, InstallResult, OpResult, SyncMode } from "../lib/types";

interface Outcome {
  outcome: string;
  message: string;
  /** Agent id or skill name, whichever identifies the row. */
  subject: string;
}

type Toast = ReturnType<typeof useToast>;

function summarize(toast: Toast, results: Outcome[]): void {
  const errors = results.filter((r) => r.outcome === "error");
  const done = results.filter((r) => r.outcome === "done" || r.outcome === "installed" || r.outcome === "updated");
  const skipped = results.filter((r) => r.outcome === "skipped");
  if (errors.length > 0) toast.error(errors.map((r) => `${r.subject}: ${r.message}`).join("\n"));
  else if (done.length > 0) toast.show(`${done.length} change${done.length === 1 ? "" : "s"} applied`, { variant: "success" });
  else if (skipped.length > 0) toast.show(skipped.map((r) => `${r.subject}: ${r.message}`).join("\n"), { variant: "info" });
}

const fromOps = (results: OpResult[]): Outcome[] => results.map((r) => ({ ...r, subject: r.agent }));
const fromInstalls = (results: InstallResult[]): Outcome[] => results.map((r) => ({ ...r, subject: r.skill }));

export function useMutations(api: Api, refetch: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (work: () => Promise<Outcome[]>): Promise<boolean> => {
      setBusy(true);
      try {
        const results = await work();
        summarize(toast, results);
        refetch();
        return !results.some((r) => r.outcome === "error");
      } catch (cause) {
        toast.error(describeError(cause));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refetch, toast],
  );

  return useMemo(
    () => ({
      busy,
      sync: (skills: string[], agents: string[], mode: SyncMode, force = false) =>
        run(async () => fromOps((await api.sync({ skills, agents, mode, force })).results)),
      remove: (skill: string, agents: string[], force = false) =>
        run(async () => fromOps((await api.remove({ skill, agents, force })).results)),
      adopt: (skill: string, from: string, force = false) => run(async () => fromOps([await api.adopt({ skill, from, force })])),
      install: (source: string, agents: string[], force = false) =>
        run(async () => fromInstalls((await api.install({ source, agents, force })).results)),
      setTags: (skill: string, tags: string[]) =>
        run(async () => {
          await api.setTags({ skill, tags });
          return [];
        }),
      setSource: (skill: string, source: string) =>
        run(async () => {
          const { lock } = await api.setSource({ skill, source });
          return [{ outcome: "done", message: `source set to ${lock.source}`, subject: skill }];
        }),
      checkUpdates: (skills?: string[]) =>
        run(async () => {
          const { checks } = await api.checkUpdates(skills === undefined ? {} : { skills });
          const updates = checks.filter((c) => c.state === "update-available" || c.state === "modified-and-update").length;
          const failed = checks.filter((c) => c.state === "error").length;
          const summary = updates === 0 ? "Everything is up to date" : `${updates} update${updates === 1 ? "" : "s"} available`;
          toast.show(failed > 0 ? `${summary} · ${failed} check${failed === 1 ? "" : "s"} failed` : summary, {
            variant: failed > 0 ? "warning" : "info",
          });
          return [];
        }),
      /** Check one skill against its source and apply the update if there is one. */
      refresh: (skill: string) =>
        run(async () => {
          const { checks } = await api.checkUpdates({ skills: [skill] });
          const check = checks[0];
          if (check === undefined) return [];
          if (check.state === "error") return [{ outcome: "error", message: check.message ?? "check failed", subject: skill }];
          if (check.state === "untracked") return [{ outcome: "error", message: "no source recorded; set one first", subject: skill }];
          if (check.state === "modified-and-update") {
            return [{ outcome: "skipped", message: "upstream changed but you edited this locally; choose in the details", subject: skill }];
          }
          if (check.state !== "update-available") {
            return [{ outcome: "skipped", message: check.state === "modified" ? "edited locally; upstream unchanged" : "already up to date", subject: skill }];
          }
          const { results } = await api.update({ skills: [skill], force: false });
          return results.map((r) => ({ ...r, subject: r.skill }));
        }),
      update: (skills?: string[], force = false) =>
        run(async () => {
          const { results } = await api.update({ ...(skills === undefined ? {} : { skills }), force });
          return results.map((r) => ({ ...r, subject: r.skill }));
        }),
    }),
    [api, busy, run, toast],
  );
}

export type Mutations = ReturnType<typeof useMutations>;
