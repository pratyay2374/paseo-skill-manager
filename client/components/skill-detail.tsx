// Expanded detail for one skill: quick actions, source and update state,
// then one line per agent with inline actions. Used by both the list row and
// the card grid. (The web build showed Tags/Read/Check on hover; touch has no
// hover, so they live here.)
import { useToast } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import type { Mutations } from "../hooks/use-mutations";
import { describeError, homeOf, tildify, timeAgo } from "../lib/format";
import { CELL_META, UPDATE_META } from "../lib/meta";
import type { Agent, Api, DiffResponse, Skill, Status } from "../lib/types";
import { DiffView } from "./diff-view";
import { AgentLogo, Button, CellDot, Field, Pill, T, useSkin, type ButtonVariant } from "./primitives";
import { TagPicker } from "./tag-picker";

const LABEL_WIDTH = 128;

function QuickActions({ skill, status, mutations, onOpen }: { skill: Skill; status: Status; mutations: Mutations; onOpen: () => void }) {
  const [tagging, setTagging] = useState(false);
  const hasUpdate = skill.update?.state === "update-available" || skill.update?.state === "modified-and-update";
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 10 }}>
      <Button small icon="FileText" label="Read" onPress={onOpen} />
      <Button small icon="Tag" label={skill.tags.length > 0 ? `Tags · ${skill.tags.length}` : "Tags"} onPress={() => setTagging(true)} />
      {skill.lock !== undefined ? (
        <Button
          small
          icon={hasUpdate ? "ArrowUp" : "RefreshCw"}
          label={hasUpdate ? "Update" : "Check for updates"}
          variant={hasUpdate ? "default" : "outline"}
          disabled={mutations.busy}
          onPress={() => void mutations.refresh(skill.name)}
        />
      ) : null}
      <TagPicker skill={skill.name} tags={skill.tags} allTags={status.tags} mutations={mutations} open={tagging} onOpenChange={setTagging} />
    </View>
  );
}

function SourceSection({ skill, mutations }: { skill: Skill; mutations: Mutations }) {
  const { layout } = useSkin();
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState("");
  const update = skill.update;

  const save = async () => {
    const value = source.trim();
    if (value === "") return;
    if (await mutations.setSource(skill.name, value)) {
      setEditing(false);
      setSource("");
    }
  };

  if (!skill.inHub) {
    return (
      <T kind="muted" size={12} style={{ paddingVertical: 8 }}>
        Not in the hub. Adopt it from an agent below to manage it and record a source.
      </T>
    );
  }
  return (
    <View style={{ paddingVertical: 8, gap: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 6 }}>
        <T kind="muted" size={12} style={{ width: layout.compact ? undefined : LABEL_WIDTH }}>
          Source
        </T>
        {skill.lock !== undefined ? (
          <>
            <T kind="mono" size={12}>
              {skill.lock.source}
            </T>
            <T kind="mono" size={11} numberOfLines={1}>
              {skill.lock.skillPath}
            </T>
          </>
        ) : (
          <T kind="muted" size={12}>
            unknown
          </T>
        )}
        {update !== undefined ? (
          <Pill tone={UPDATE_META[update.state].tone}>
            {UPDATE_META[update.state].label} · {timeAgo(update.checkedAt)}
          </Pill>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginLeft: layout.compact ? 0 : "auto" }}>
          {update?.state === "modified-and-update" ? (
            <Button small variant="destructive" label="Update (discard edits)" disabled={mutations.busy} onPress={() => void mutations.update([skill.name], true)} />
          ) : null}
          {skill.lock === undefined && skill.registry !== undefined ? (
            <Button small variant="default" label={`Use ${skill.registry.source}`} disabled={mutations.busy} onPress={() => void mutations.setSource(skill.name, skill.registry?.id ?? "")} />
          ) : null}
          <Button small label={skill.lock === undefined ? "Set source" : "Change"} onPress={() => setEditing((value) => !value)} />
        </View>
      </View>
      {update?.message !== undefined && update.state === "error" ? (
        <T kind="danger" size={12}>
          {update.message}
        </T>
      ) : null}
      {editing ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: layout.compact ? 0 : LABEL_WIDTH + 12 }}>
          <Field value={source} onChangeText={setSource} placeholder="owner/repo@skill · owner/repo/path · https://github.com/…" onSubmit={() => void save()} autoFocus style={{ flex: 1 }} />
          <Button small variant="default" label="Save" disabled={mutations.busy || source.trim() === ""} onPress={() => void save()} />
        </View>
      ) : null}
    </View>
  );
}

function AgentLine({ skill, agent, status, api, mutations }: { skill: Skill; agent: Agent; status: Status; api: Api; mutations: Mutations }) {
  const { c, layout } = useSkin();
  const toast = useToast();
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const cell = skill.cells[agent.id];
  const state = cell?.state ?? "missing";
  const home = homeOf(status);
  const { busy } = mutations;
  const name = skill.name;
  const id = agent.id;

  const toggleDiff = async () => {
    if (diff !== null) return setDiff(null);
    try {
      setDiff(await api.diff({ skill: name, agent: id }));
    } catch (cause) {
      toast.error(describeError(cause));
    }
  };

  const actions: ReactNode[] = [];
  const add = (key: string, label: string, onPress: () => void, variant: ButtonVariant = "outline") =>
    actions.push(<Button key={key} small variant={variant} label={label} disabled={busy} onPress={onPress} />);

  if (state === "hub") add("linkanyway", "Add a link anyway", () => void mutations.sync([name], [id], "link", true));
  if (skill.inHub && (state === "missing" || state === "broken")) {
    add("link", "Link", () => void mutations.sync([name], [id], "link", state === "broken"), "default");
    add("copy", "Copy", () => void mutations.sync([name], [id], "copy", state === "broken"));
  }
  if (state === "same") add("relink", "Replace with link", () => void mutations.sync([name], [id], "link"));
  if (state === "modified" || state === "external-link") {
    add("diff", diff === null ? "Diff" : "Hide diff", () => void toggleDiff());
    add("hub", "Use hub version", () => void mutations.sync([name], [id], "link", true), "destructive");
    add("adopt", "Use this version", () => void mutations.adopt(name, id, true), "destructive");
  }
  if (state === "unmanaged") add("adopt", "Adopt into hub", () => void mutations.adopt(name, id), "default");
  if (state !== "missing" && state !== "hub") {
    const risky = state === "modified" || state === "unmanaged";
    add("remove", risky ? "Delete" : "Remove", () => void mutations.remove(name, [id], risky), risky ? "destructive" : "outline");
  }

  return (
    <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, width: layout.compact ? undefined : LABEL_WIDTH }}>
          <AgentLogo agent={agent} />
          <T size={13}>{agent.label}</T>
          <CellDot state={state} />
        </View>
        <T kind="muted" size={12}>
          {CELL_META[state].title}
        </T>
        <T kind="mono" size={11} numberOfLines={1} style={{ flex: 1, minWidth: 120, opacity: 0.8 }}>
          {cell !== undefined ? tildify(cell.target ?? cell.path, home) : tildify(agent.dir, home)}
        </T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{actions}</View>
      </View>
      {diff !== null ? (
        <View style={{ marginTop: 8 }}>
          <DiffView diff={diff} />
        </View>
      ) : null}
    </View>
  );
}

export function SkillDetail({
  skill,
  agents,
  status,
  api,
  mutations,
  onOpen,
}: {
  skill: Skill;
  agents: Agent[];
  status: Status;
  api: Api;
  mutations: Mutations;
  onOpen: () => void;
}) {
  const missingAgents = skill.inHub
    ? agents.filter((agent) => (skill.cells[agent.id]?.state ?? "missing") === "missing").map((agent) => agent.id)
    : [];
  return (
    <View>
      <QuickActions skill={skill} status={status} mutations={mutations} onOpen={onOpen} />
      <SourceSection skill={skill} mutations={mutations} />
      <View>
        {agents.map((agent) => (
          <AgentLine key={agent.id} skill={skill} agent={agent} status={status} api={api} mutations={mutations} />
        ))}
      </View>
      {missingAgents.length > 1 ? (
        <View style={{ paddingTop: 8, flexDirection: "row" }}>
          <Button
            small
            label={`Install into all ${missingAgents.length} missing agents`}
            disabled={mutations.busy}
            onPress={() => void mutations.sync([skill.name], missingAgents, status.defaultMode)}
          />
        </View>
      ) : null}
    </View>
  );
}
