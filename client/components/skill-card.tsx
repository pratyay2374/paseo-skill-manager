// One skill in the grid view. The selected card's detail renders as a
// full-width block right after it.
import { Icon } from "@getpaseo/plugin/client/react-native";
import { Pressable, View } from "react-native";
import type { Mutations } from "../hooks/use-mutations";
import { formatCount } from "../lib/format";
import { CELL_META, alpha } from "../lib/meta";
import type { Agent, Api, Skill, Status } from "../lib/types";
import { AgentMark, Button, Pill, SkillLogo, T, useSkin } from "./primitives";
import { SkillDetail } from "./skill-detail";
import { TagChip } from "./tags";

/** Download count and repo stars; a placeholder while the registry lookup is pending. */
export function SkillStats({ skill }: { skill: Skill }) {
  const { c } = useSkin();
  const stars = skill.registry?.stars ?? skill.stars ?? null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {skill.registry !== undefined ? (
        <View accessibilityLabel={`${skill.registry.installs.toLocaleString()} installs on skills.sh`} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name="Download" size={13} color={c.accent} />
          <T size={12} weight="500">
            {formatCount(skill.registry.installs)}
          </T>
        </View>
      ) : skill.lock?.sourceType === "github" && skill.registryChecked !== true ? (
        <View style={{ width: 40, height: 12, borderRadius: 3, backgroundColor: c.surface2 }} />
      ) : null}
      {stars !== null ? (
        <View accessibilityLabel={`${stars.toLocaleString()} stars on GitHub`} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name="Star" size={13} color={c.statusWarning} />
          <T size={12} weight="500">
            {formatCount(stars)}
          </T>
        </View>
      ) : null}
    </View>
  );
}

export function sourceLabel(skill: Skill): string {
  return skill.lock?.source ?? (skill.registry !== undefined ? `${skill.registry.source}?` : skill.inHub ? "no source recorded" : "not in hub");
}

export function SkillCard({
  skill,
  agents,
  status,
  mutations,
  selected,
  onSelect,
  focus,
  width,
}: {
  skill: Skill;
  agents: Agent[];
  status: Status;
  mutations: Mutations;
  selected: boolean;
  onSelect: () => void;
  /** When set, the card describes this one agent's relationship to the skill. */
  focus?: Agent;
  width: number;
}) {
  const { c } = useSkin();
  const focusState = focus !== undefined ? (skill.cells[focus.id]?.state ?? "missing") : null;
  const absent = focusState === "missing";
  const hasUpdate = skill.update?.state === "update-available" || skill.update?.state === "modified-and-update";
  const edge = hasUpdate ? alpha(c.statusWarning, 0.7) : selected ? alpha(c.accent, 0.7) : c.border;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: selected }}
      accessibilityLabel={`${skill.name}, ${sourceLabel(skill)}`}
      onPress={onSelect}
      style={({ pressed }) => ({
        width,
        minHeight: 84,
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: edge,
        backgroundColor: hasUpdate ? alpha(c.statusWarning, 0.06) : c.surface1,
        opacity: absent ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <SkillLogo skill={skill} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={14} weight="500" numberOfLines={1}>
            {skill.name}
          </T>
          <T kind="mono" size={11} numberOfLines={1} style={{ marginTop: 2 }}>
            {sourceLabel(skill)}
          </T>
        </View>
        <SkillStats skill={skill} />
      </View>
      <View style={{ marginTop: "auto", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {focus !== undefined && focusState !== null ? (
          absent ? (
            <>
              <T kind="muted" size={11}>
                Not in {focus.label}
              </T>
              {skill.inHub ? (
                <Button small icon="Plus" label="Add" variant="default" disabled={mutations.busy} onPress={() => void mutations.sync([skill.name], [focus.id], status.defaultMode)} />
              ) : null}
            </>
          ) : (
            <Pill tone={CELL_META[focusState].tone}>{CELL_META[focusState].label}</Pill>
          )
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, flexShrink: 1 }}>
              {skill.tags.map((tag) => (
                <TagChip key={tag} tag={tag} small />
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {agents.map((agent) => (
                <AgentMark key={agent.id} agent={agent} state={skill.cells[agent.id]?.state ?? "missing"} />
              ))}
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

export function SkillCardDetail({
  skill,
  agents,
  status,
  api,
  mutations,
  focus,
  onOpen,
}: {
  skill: Skill;
  agents: Agent[];
  status: Status;
  api: Api;
  mutations: Mutations;
  focus?: Agent;
  onOpen: () => void;
}) {
  const { c } = useSkin();
  return (
    <View style={{ width: "100%", borderRadius: 8, borderWidth: 1, borderColor: alpha(c.accent, 0.4), backgroundColor: c.surface1, paddingHorizontal: 16, paddingBottom: 12 }}>
      <SkillDetail skill={skill} agents={focus !== undefined ? [focus] : agents} status={status} api={api} mutations={mutations} onOpen={onOpen} />
    </View>
  );
}
