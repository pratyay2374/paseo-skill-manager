// Dashboard header: the skill count with one chip per agent, and a row of
// stat tiles. Everything is derived from the current scan.
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Mutations } from "../hooks/use-mutations";
import { isDrifted, type Tone } from "../lib/meta";
import type { Agent, Skill, Status } from "../lib/types";
import { AgentLogo, SkillLogo, T, skillHealth, sourceOwner, useSkin, type SkillHealth } from "./primitives";

// ---------------------------------------------------------------- model ----

interface Issue {
  skill: Skill;
  agent?: Agent;
  kind: "update" | "modified" | "broken" | "unmanaged";
  text: string;
  action?: { label: string; run: () => void };
}

export function summarize(status: Status, agents: Agent[], mutations: Mutations) {
  const hub = status.skills.filter((skill) => skill.inHub);
  const tracked = hub.filter((skill) => skill.lock !== undefined).length;
  const updates = hub.filter((skill) => skill.update?.state === "update-available" || skill.update?.state === "modified-and-update");

  const updateSources = new Map<string, { key: string; name: string; skills: Skill[] }>();
  for (const skill of updates) {
    const owner = sourceOwner(skill);
    const source = skill.lock?.source ?? skill.name;
    const key = owner !== null ? `${owner.host}:${owner.owner.toLowerCase()}` : `${skill.lock?.sourceType ?? "unknown"}:${source}`;
    const group = updateSources.get(key);
    if (group !== undefined) group.skills.push(skill);
    else updateSources.set(key, { key, name: owner?.owner ?? source, skills: [skill] });
  }

  const issues: Issue[] = [];
  for (const skill of updates) {
    const edited = skill.update?.state === "modified-and-update";
    issues.push({
      skill,
      kind: "update",
      text: edited ? "newer upstream, but edited locally" : "newer version available",
      action: edited ? undefined : { label: "Update", run: () => void mutations.update([skill.name]) },
    });
  }
  for (const skill of status.skills) {
    for (const agent of agents) {
      const state = skill.cells[agent.id]?.state ?? "missing";
      if (state === "broken") {
        issues.push({
          skill,
          agent,
          kind: "broken",
          text: `broken in ${agent.label}`,
          action: skill.inHub ? { label: "Repair", run: () => void mutations.sync([skill.name], [agent.id], "link", true) } : undefined,
        });
      } else if (state === "modified" || state === "external-link") {
        issues.push({ skill, agent, kind: "modified", text: `${agent.label}'s copy differs from the hub` });
      }
    }
    if (!skill.inHub) {
      const owner = agents.find((agent) => skill.cells[agent.id]?.state === "unmanaged");
      issues.push({
        skill,
        agent: owner,
        kind: "unmanaged",
        text: owner !== undefined ? `only in ${owner.label}, not in the hub` : "not in the hub",
        action: owner !== undefined ? { label: "Adopt", run: () => void mutations.adopt(skill.name, owner.id) } : undefined,
      });
    }
  }

  const missing = hub.reduce((count, skill) => count + agents.filter((agent) => (skill.cells[agent.id]?.state ?? "missing") === "missing").length, 0);

  const coverage = agents.map((agent) => {
    const has = hub.filter((skill) => (skill.cells[agent.id]?.state ?? "missing") !== "missing").length;
    const viaHub = hub.filter((skill) => skill.cells[agent.id]?.state === "hub").length;
    const drift = status.skills.filter((skill) => isDrifted(skill.cells[agent.id]?.state ?? "missing")).length;
    return { agent, has, total: hub.length, viaHub, drift };
  });

  const health: Record<SkillHealth, number> = { synced: 0, drifted: 0, update: 0, unmanaged: 0, partial: 0, broken: 0 };
  for (const skill of status.skills) health[skillHealth(skill, agents).health]++;

  return { total: status.skills.length, hub: hub.length, tracked, updates: updates.length, updateSources: [...updateSources.values()], issues, missing, coverage, health };
}

type Summary = ReturnType<typeof summarize>;

// ------------------------------------------------------------- pieces ----

/** Top strip: the headline number and one chip per agent (mark + count). */
function Headline({ summary, selected, onSelect }: { summary: Summary; selected: string | null; onSelect: (id: string | null) => void }) {
  const { c } = useSkin();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", columnGap: 32, rowGap: 12 }}>
      <View>
        <Text style={{ color: c.foreground, fontSize: 36, fontWeight: "600", lineHeight: 38 }}>{summary.total}</Text>
        <T kind="muted" size={13} style={{ marginTop: 6 }}>
          skills · {summary.hub} in the hub · {summary.tracked} with a known source
        </T>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {summary.coverage.map(({ agent, has }) => {
          const active = selected === agent.id;
          return (
            <Pressable
              key={agent.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !agent.active }}
              accessibilityLabel={agent.active ? `${agent.label}: ${has} skills` : `${agent.label}: not installed`}
              disabled={!agent.active}
              onPress={() => onSelect(active ? null : agent.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 32,
                paddingHorizontal: 8,
                borderRadius: 6,
                backgroundColor: active ? c.surface2 : "transparent",
                opacity: agent.active ? 1 : 0.4,
              }}
            >
              <AgentLogo agent={agent} color={active ? c.foreground : undefined} />
              <Text style={{ fontSize: 13, color: active ? c.foreground : c.foregroundMuted }}>{agent.active ? has : "–"}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Shared geometry keeps metrics and their footer visuals aligned. */
function Tile({
  label,
  value,
  note,
  segments = [],
  children,
  compact,
}: {
  label: string;
  value: ReactNode;
  note: string;
  segments?: Array<{ value: number; tone: Tone; label: string }>;
  children?: ReactNode;
  compact: boolean;
}) {
  const skin = useSkin();
  const { c } = skin;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <View style={{ flexGrow: 1, flexBasis: compact ? "100%" : 0, minWidth: 0, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface1, paddingHorizontal: 20, paddingVertical: 16 }}>
      <T kind="muted" size={13}>
        {label}
      </T>
      <Text style={{ color: c.foreground, fontSize: 28, fontWeight: "600", marginTop: 4 }}>{value}</Text>
      <T kind="muted" size={12} style={{ marginTop: 6 }}>
        {note}
      </T>
      <View style={{ marginTop: "auto", paddingTop: 16, minHeight: 32, justifyContent: "center" }}>
        {children ?? (
          <View style={{ flexDirection: "row", height: 6, gap: 2, borderRadius: 3, overflow: "hidden" }}>
            {total === 0 ? (
              <View style={{ flex: 1, backgroundColor: c.surface2 }} />
            ) : (
              segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <View key={segment.label} accessibilityLabel={`${segment.label}: ${segment.value}`} style={{ flexGrow: segment.value, borderRadius: 3, backgroundColor: skin.tone(segment.tone) }} />
                ))
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/** Owners with pending updates; tap one to list its skills. */
function UpdateSources({ groups }: { groups: Summary["updateSources"] }) {
  const { c } = useSkin();
  const [open, setOpen] = useState<string | null>(null);
  if (groups.length === 0) {
    return (
      <T kind="muted" size={12}>
        No update sources to show
      </T>
    );
  }
  const current = groups.find((group) => group.key === open);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 4 }}>
        {groups.map((group, index) => (
          <Pressable
            key={group.key}
            accessibilityRole="button"
            accessibilityState={{ expanded: open === group.key }}
            accessibilityLabel={`${group.name}: ${group.skills.length} skills to update`}
            onPress={() => setOpen((value) => (value === group.key ? null : group.key))}
            style={{ transform: [{ rotate: index % 2 === 0 ? "-8deg" : "8deg" }] }}
          >
            <View style={{ padding: 3, borderRadius: 8, borderWidth: 1, borderColor: open === group.key ? c.accent : c.border, backgroundColor: c.surface2 }}>
              <SkillLogo skill={group.skills[0]!} size={24} />
            </View>
            <View style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 9, fontWeight: "600", color: c.foreground }}>{group.skills.length}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {current !== undefined ? (
        <View style={{ gap: 4 }}>
          <T size={13} weight="500">
            {current.name}
          </T>
          {current.skills.map((skill) => (
            <T key={skill.name} size={12}>
              {skill.name}
              {skill.update?.state === "modified-and-update" ? <Text style={{ color: c.foregroundMuted }}> · edited locally</Text> : null}
            </T>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ----------------------------------------------------------------- root ----

export function Dashboard({
  status,
  agents,
  mutations,
  selectedAgent,
  onSelectAgent,
}: {
  status: Status;
  agents: Agent[];
  mutations: Mutations;
  selectedAgent: string | null;
  onSelectAgent: (agentId: string | null) => void;
}) {
  const { layout } = useSkin();
  const summary = summarize(status, agents, mutations);
  const { health } = summary;
  const inSync = health.synced;
  const attention = summary.issues.length + summary.missing;

  return (
    <View style={{ gap: 16 }}>
      <Headline summary={summary} selected={selectedAgent} onSelect={onSelectAgent} />
      <View style={{ flexDirection: layout.compact ? "column" : "row", gap: 12 }}>
        <Tile
          compact={layout.compact}
          label="In sync"
          value={inSync}
          note={`${summary.total === 0 ? 0 : Math.round((inSync / summary.total) * 100)}% of skills`}
          segments={[
            { value: health.synced, tone: "success", label: "In sync" },
            { value: health.partial, tone: "attention", label: "Missing somewhere" },
            { value: health.drifted, tone: "warning", label: "Drifted" },
            { value: health.update, tone: "primary", label: "Update available" },
            { value: health.unmanaged, tone: "muted", label: "Not in hub" },
            { value: health.broken, tone: "danger", label: "Broken" },
          ]}
        />
        <Tile
          compact={layout.compact}
          label="Updates"
          value={summary.updates}
          note={summary.tracked === 0 ? "record a source to enable checks" : summary.updates === 0 ? "nothing newer upstream" : "newer versions available"}
        >
          <UpdateSources groups={summary.updateSources} />
        </Tile>
        <Tile
          compact={layout.compact}
          label="Gaps"
          value={attention}
          note={attention === 0 ? "everything is where it should be" : `${summary.missing} missing link${summary.missing === 1 ? "" : "s"} · ${summary.issues.length} to decide`}
          segments={[
            { value: summary.missing, tone: "attention", label: "Missing in an agent" },
            { value: summary.issues.length, tone: "warning", label: "Needs a decision" },
          ]}
        />
      </View>
    </View>
  );
}
