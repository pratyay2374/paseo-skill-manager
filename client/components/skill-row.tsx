// One skill in the list view: collapsed summary with per-agent marks,
// expanding to the shared detail block.
import { Pressable, View } from "react-native";
import type { Mutations } from "../hooks/use-mutations";
import { CELL_META } from "../lib/meta";
import type { Agent, Api, Skill, Status } from "../lib/types";
import { AgentMark, Chevron, Pill, SkillLogo, SkillStatus, T, useSkin } from "./primitives";
import { SkillStats } from "./skill-card";
import { SkillDetail } from "./skill-detail";
import { TagChip } from "./tags";

export function SkillRow({
  skill,
  agents,
  status,
  api,
  mutations,
  expanded,
  onToggle,
  onOpen,
  focus,
  last,
}: {
  skill: Skill;
  agents: Agent[];
  status: Status;
  api: Api;
  mutations: Mutations;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  focus?: Agent;
  last: boolean;
}) {
  const { c, layout } = useSkin();
  const focusState = focus !== undefined ? (skill.cells[focus.id]?.state ?? "missing") : null;
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, opacity: focusState === "missing" ? 0.6 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={skill.name}
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: pressed ? c.surface2 : "transparent",
        })}
      >
        <Chevron open={expanded} />
        <SkillLogo skill={skill} />
        <View style={{ flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <T size={14} weight="500" numberOfLines={1}>
            {skill.name}
          </T>
          {focusState !== null ? (
            focusState === "missing" ? (
              <T kind="muted" size={11}>
                not in {focus?.label}
              </T>
            ) : (
              <Pill tone={CELL_META[focusState].tone}>{CELL_META[focusState].label}</Pill>
            )
          ) : (
            <SkillStatus skill={skill} agents={agents} />
          )}
          {skill.lock !== undefined ? (
            <T kind="mono" size={11} numberOfLines={1}>
              {skill.lock.source}
            </T>
          ) : null}
          <SkillStats skill={skill} />
          {skill.tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </View>
        {focus === undefined && !layout.compact ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 4 }}>
            {agents.map((agent) => (
              <AgentMark key={agent.id} agent={agent} state={skill.cells[agent.id]?.state ?? "missing"} />
            ))}
          </View>
        ) : null}
      </Pressable>
      {expanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface0, paddingHorizontal: 12, paddingLeft: layout.compact ? 12 : 36, paddingBottom: 8 }}>
          <SkillDetail skill={skill} agents={focus !== undefined ? [focus] : agents} status={status} api={api} mutations={mutations} onOpen={onOpen} />
        </View>
      ) : null}
    </View>
  );
}
