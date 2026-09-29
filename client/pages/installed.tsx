// The Installed tab: a dashboard header, search, and the skills as a card
// grid or a list. Selecting an agent shows that agent's view: its skills first, then
// hub skills it could add, each card describing only that agent.
import { Fragment, useMemo, useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { Dashboard } from "../components/dashboard";
import { Button, Chevron, Empty, Field, OwnerAvatar, Panel, Segmented, T, useSkin } from "../components/primitives";
import { SkillCard, SkillCardDetail } from "../components/skill-card";
import { SkillRow } from "../components/skill-row";
import { TagFilter, UNTAGGED } from "../components/tags";
import type { Mutations } from "../hooks/use-mutations";
import type { Agent, Api, Skill, Status } from "../lib/types";

type SkillView = "grid" | "list" | "groups";

const VIEWS: Array<{ key: SkillView; icon: string; accessibilityLabel: string }> = [
  { key: "grid", icon: "LayoutGrid", accessibilityLabel: "Cards" },
  { key: "list", icon: "List", accessibilityLabel: "List" },
  { key: "groups", icon: "Layers", accessibilityLabel: "By source" },
];

const GAP = 8;

/** Group skills by their source repo (or the skills.sh match); untracked skills go last. */
function groupBySource(skills: Skill[]): Array<{ key: string; owner: string | null; skills: Skill[] }> {
  const groups = new Map<string, Skill[]>();
  for (const skill of skills) {
    const key = skill.lock?.source ?? skill.registry?.source ?? (skill.inHub ? "No source recorded" : "Not in the hub");
    const list = groups.get(key);
    if (list === undefined) groups.set(key, [skill]);
    else list.push(skill);
  }
  const untracked = new Set(["No source recorded", "Not in the hub"]);
  return [...groups.entries()]
    .map(([key, list]) => ({ key, owner: untracked.has(key) ? null : (key.split("/")[0] ?? null), skills: list }))
    .sort((a, b) => {
      const ua = untracked.has(a.key) ? 1 : 0;
      const ub = untracked.has(b.key) ? 1 : 0;
      if (ua !== ub) return ua - ub;
      return b.skills.length - a.skills.length || a.key.localeCompare(b.key);
    });
}

function hasUpdate(skill: Skill): boolean {
  return skill.update?.state === "update-available" || skill.update?.state === "modified-and-update";
}

function isMissingSomewhere(skill: Skill, agents: Agent[]): boolean {
  return skill.inHub && agents.some((agent) => (skill.cells[agent.id]?.state ?? "missing") === "missing");
}

/** Width of one card for the measured container: 1, 2 or 3 columns. */
function cardWidth(container: number): number {
  const columns = container >= 900 ? 3 : container >= 560 ? 2 : 1;
  return Math.floor((container - GAP * (columns - 1)) / columns);
}

export function InstalledPage({
  status,
  api,
  mutations,
  refetch,
  onOpen,
}: {
  status: Status;
  api: Api;
  mutations: Mutations;
  refetch: () => void;
  onOpen: (skill: string) => void;
}) {
  const { c } = useSkin();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<SkillView>("grid");
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const toggleGroup = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const agents = useMemo(() => status.agents.filter((agent) => showAllAgents || agent.active), [status, showAllAgents]);
  const focus = agentFilter !== null ? status.agents.find((agent) => agent.id === agentFilter) : undefined;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = status.skills.filter((skill) => {
      if (needle !== "" && !skill.name.includes(needle) && !skill.description.toLowerCase().includes(needle)) return false;
      if (tagFilter === UNTAGGED && skill.tags.length > 0) return false;
      if (tagFilter !== null && tagFilter !== UNTAGGED && !skill.tags.includes(tagFilter)) return false;
      // In an agent's view, skills it lacks stay visible (dimmed, with Add) only when the hub can supply them.
      if (focus !== undefined && (skill.cells[focus.id]?.state ?? "missing") === "missing" && !skill.inHub) return false;
      return true;
    });
    if (focus === undefined) return rows;
    // The agent's own skills first, then what it could add.
    const has = (skill: Skill) => (skill.cells[focus.id]?.state ?? "missing") !== "missing";
    return [...rows.filter(has), ...rows.filter((skill) => !has(skill))];
  }, [status, query, tagFilter, focus]);
  const untaggedCount = status.skills.filter((skill) => skill.tags.length === 0).length;

  const hubSkills = status.skills.filter((skill) => skill.inHub);
  const targets = focus !== undefined ? [focus] : agents;
  const missingCount = status.skills.filter((skill) => isMissingSomewhere(skill, targets)).length;
  const updateCount = status.skills.filter(hasUpdate).length;
  const tracked = status.skills.filter((skill) => skill.lock !== undefined).length;
  const toggle = (name: string) => setSelected((current) => (current === name ? null : name));

  const grid = (skills: Skill[]) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {width > 0
        ? skills.map((skill) => (
            <Fragment key={skill.name}>
              <SkillCard
                skill={skill}
                agents={agents}
                status={status}
                mutations={mutations}
                selected={selected === skill.name}
                onSelect={() => toggle(skill.name)}
                focus={focus}
                width={cardWidth(width)}
              />
              {selected === skill.name ? (
                <SkillCardDetail skill={skill} agents={agents} status={status} api={api} mutations={mutations} focus={focus} onOpen={() => onOpen(skill.name)} />
              ) : null}
            </Fragment>
          ))
        : null}
    </View>
  );

  const installLabel =
    missingCount === 0
      ? focus !== undefined
        ? `${focus.label} has everything`
        : "All installed"
      : focus !== undefined
        ? `Add ${missingCount} to ${focus.label}`
        : `Install missing (${missingCount})`;

  return (
    <View onLayout={onLayout} style={{ gap: 12 }}>
      <Dashboard status={status} agents={agents} mutations={mutations} selectedAgent={agentFilter} onSelectAgent={setAgentFilter} />

      {/* Toolbar: search, then actions, then view controls */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
        <Field value={query} onChangeText={setQuery} placeholder="Filter skills…" style={{ width: 224 }} />
        <Button icon="RefreshCw" label="Check updates" disabled={mutations.busy || tracked === 0} onPress={() => void mutations.checkUpdates()} />
        {updateCount > 0 ? <Button label={`Update ${updateCount}`} disabled={mutations.busy} onPress={() => void mutations.update()} /> : null}
        <Button
          icon="Download"
          variant="default"
          label={installLabel}
          disabled={mutations.busy || missingCount === 0}
          onPress={() => void mutations.sync(hubSkills.map((skill) => skill.name), targets.map((agent) => agent.id), status.defaultMode)}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <Segmented value={view} options={VIEWS} onChange={setView} />
          <Button icon="RotateCcw" variant="ghost" accessibilityLabel="Rescan" onPress={refetch} />
          <Button
            icon={showAllAgents ? "EyeOff" : "Eye"}
            variant="ghost"
            accessibilityLabel={showAllAgents ? "Hide agents that are not installed" : "Show every agent"}
            onPress={() => setShowAllAgents((value) => !value)}
          />
        </View>
      </View>

      <TagFilter tags={status.tags} untaggedCount={untaggedCount} selected={tagFilter} onSelect={setTagFilter} />

      {visible.length === 0 ? (
        <Panel>
          <Empty>{status.skills.length === 0 ? "No skills found in the hub or any agent." : "Nothing matches."}</Empty>
        </Panel>
      ) : view === "groups" ? (
        <View style={{ gap: 20 }}>
          {groupBySource(visible).map((group) => {
            const open = !collapsed.has(group.key);
            return (
              <View key={group.key}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => toggleGroup(group.key)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, marginBottom: 8 }}
                >
                  <Chevron open={open} />
                  <OwnerAvatar owner={group.owner} letter={group.key} size={24} />
                  <T size={14} weight="500">
                    {group.key}
                  </T>
                  <Text style={{ fontSize: 12, color: c.foregroundMuted }}>{group.skills.length}</Text>
                </Pressable>
                {open ? grid(group.skills) : null}
              </View>
            );
          })}
        </View>
      ) : view === "grid" ? (
        grid(visible)
      ) : (
        <Panel>
          {visible.map((skill, index) => (
            <SkillRow
              key={skill.name}
              skill={skill}
              agents={agents}
              status={status}
              api={api}
              mutations={mutations}
              expanded={selected === skill.name}
              onToggle={() => toggle(skill.name)}
              onOpen={() => onOpen(skill.name)}
              focus={focus}
              last={index === visible.length - 1}
            />
          ))}
        </Panel>
      )}
    </View>
  );
}
