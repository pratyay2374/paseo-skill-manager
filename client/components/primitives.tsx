// Small presentational pieces shared across the page. Everything takes its
// colours from the active Paseo theme through `useSkin()`.
import type { PluginHostProps } from "@getpaseo/plugin/client";
import { Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Image, Platform, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { CELL_META, alpha, isDrifted, toneColor, type Tone } from "../lib/meta";
import type { Agent, CellState, Skill } from "../lib/types";

// ------------------------------------------------------------------ skin ----

export interface Skin {
  theme: PluginHostProps["theme"];
  layout: PluginHostProps["layout"];
}

const SkinContext = createContext<Skin | null>(null);

export function SkinProvider({ skin, children }: { skin: Skin; children: ReactNode }) {
  return <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>;
}

export function useSkin(): Skin & { c: Skin["theme"]["colors"]; tone: (tone: Tone) => string } {
  const skin = useContext(SkinContext);
  if (skin === null) throw new Error("useSkin outside SkinProvider");
  return { ...skin, c: skin.theme.colors, tone: (tone: Tone) => toneColor(skin.theme, tone) };
}

export const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, Consolas, monospace" });

// ------------------------------------------------------------------ text ----

type TextKind = "title" | "body" | "muted" | "subtle" | "mono" | "danger";

export function T({
  kind = "body",
  size = 13,
  weight,
  numberOfLines,
  selectable,
  style,
  children,
}: {
  kind?: TextKind;
  size?: number;
  weight?: TextStyle["fontWeight"];
  numberOfLines?: number;
  selectable?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const { c } = useSkin();
  const color = kind === "title" || kind === "body" ? c.foreground : kind === "danger" ? c.statusDanger : c.foregroundMuted;
  const base: TextStyle = {
    color,
    fontSize: size,
    ...(kind === "subtle" ? { opacity: 0.8 } : {}),
    ...(kind === "mono" ? { fontFamily: MONO } : {}),
    ...(kind === "title" ? { fontWeight: "600" } : {}),
    ...(weight !== undefined ? { fontWeight: weight } : {}),
  };
  return (
    <Text style={[base, style]} numberOfLines={numberOfLines} selectable={selectable}>
      {children}
    </Text>
  );
}

// --------------------------------------------------------------- buttons ----

export type ButtonVariant = "default" | "outline" | "destructive" | "ghost";

export function Button({
  label,
  icon,
  onPress,
  disabled = false,
  variant = "outline",
  small = false,
  accessibilityLabel,
}: {
  label?: string;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  small?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useSkin();
  const fill = variant === "default" ? c.accent : variant === "destructive" ? alpha(c.statusDanger, 0.14) : "transparent";
  const border = variant === "outline" ? c.border : variant === "destructive" ? alpha(c.statusDanger, 0.5) : "transparent";
  const ink = variant === "default" ? c.accentForeground : variant === "destructive" ? c.statusDanger : c.foreground;
  const iconOnly = label === undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: small ? 28 : 32,
        minWidth: iconOnly ? (small ? 28 : 32) : undefined,
        paddingHorizontal: iconOnly ? 0 : small ? 10 : 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: fill,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {icon !== undefined ? <Icon name={icon} size={small ? 14 : 16} color={ink} /> : null}
      {label !== undefined ? <Text style={{ color: ink, fontSize: small ? 12 : 13, fontWeight: "500" }}>{label}</Text> : null}
    </Pressable>
  );
}

/** A two-or-more option switch; the selected option is filled. */
export function Segmented<K extends string>({
  value,
  options,
  onChange,
}: {
  value: K;
  options: Array<{ key: K; label?: string; icon?: string; accessibilityLabel?: string }>;
  onChange: (value: K) => void;
}) {
  const { c } = useSkin();
  return (
    <View style={{ flexDirection: "row", borderWidth: 1, borderColor: c.border, borderRadius: 6, padding: 2, gap: 2 }}>
      {options.map((option) => {
        const on = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.key)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 26,
              paddingHorizontal: option.label !== undefined ? 10 : 6,
              borderRadius: 4,
              backgroundColor: on ? c.surface2 : "transparent",
            }}
          >
            {option.icon !== undefined ? <Icon name={option.icon} size={15} color={on ? c.foreground : c.foregroundMuted} /> : null}
            {option.label !== undefined ? <Text style={{ fontSize: 12, color: on ? c.foreground : c.foregroundMuted }}>{option.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- inputs ----

export function Field({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  autoFocus,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useSkin();
  return (
    <View style={[{ height: 32, borderWidth: 1, borderColor: c.border, borderRadius: 6, backgroundColor: c.surface2, justifyContent: "center" }, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.foregroundMuted}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit !== undefined ? "search" : undefined}
        style={{ color: c.foreground, fontSize: 13, paddingHorizontal: 10, height: 30 }}
      />
    </View>
  );
}

// ------------------------------------------------------------ indicators ----

export function Dot({ tone, hollow = false, size = 8 }: { tone: Tone; hollow?: boolean; size?: number }) {
  const skin = useSkin();
  const color = skin.tone(tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: hollow ? "transparent" : color,
        borderWidth: hollow ? 1.5 : 0,
        borderColor: hollow ? skin.c.foregroundMuted : undefined,
        opacity: hollow ? 0.5 : 1,
      }}
    />
  );
}

export function CellDot({ state, size = 8 }: { state: CellState; size?: number }) {
  const skin = useSkin();
  if (state === "hub") {
    // Ring rather than a filled dot: the agent sees the skill, but through the hub.
    return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: skin.tone("success") }} />;
  }
  return <Dot tone={CELL_META[state].tone} hollow={state === "missing"} size={size} />;
}

export function Pill({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const { c } = useSkin();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 20,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface2,
      }}
    >
      {tone !== undefined ? <Dot tone={tone} size={6} /> : null}
      <Text style={{ color: c.foreground, fontSize: 11 }}>{children}</Text>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={{ padding: 32, alignItems: "center" }}>
      <T kind="muted" style={{ textAlign: "center" }}>
        {children}
      </T>
    </View>
  );
}

/** A bordered panel on the raised surface. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useSkin();
  return <View style={[{ borderWidth: 1, borderColor: c.border, borderRadius: 8, backgroundColor: c.surface1, overflow: "hidden" }, style]}>{children}</View>;
}

// ---------------------------------------------------------------- agents ----

/** Short marks for the default agents; Paseo exposes no provider logos to plugins. */
const AGENT_MARKS: Record<string, string> = {
  claude: "CC",
  codex: "Cx",
  pi: "Pi",
  opencode: "OC",
  gemini: "Gm",
  cursor: "Cu",
  copilot: "Cp",
};

export function agentMark(agent: Pick<Agent, "id" | "label">): string {
  return AGENT_MARKS[agent.id] ?? agent.label.slice(0, 2);
}

/** The agent's two-letter mark in a tile. */
export function AgentLogo({ agent, size = 16 }: { agent: Agent; size?: number }) {
  const { c } = useSkin();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size + 4, height: size, borderRadius: 3, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color: c.foregroundMuted, fontSize: Math.max(8, size * 0.55), fontWeight: "600" }}>{agentMark(agent)}</Text>
    </View>
  );
}

/** Mark with a state dot in the corner; faded when the agent lacks the skill. */
export function AgentMark({ agent, state }: { agent: Agent; state: CellState }) {
  const { c } = useSkin();
  return (
    <View accessibilityLabel={`${agent.label}: ${CELL_META[state].title}`} style={{ padding: 2, opacity: state === "missing" ? 0.25 : 0.85 }}>
      <AgentLogo agent={agent} size={13} />
      {state !== "missing" ? (
        <View style={{ position: "absolute", right: 0, top: 0, borderRadius: 4, borderWidth: 1, borderColor: c.surface1 }}>
          <CellDot state={state} size={5} />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- skills ----

/** Owner of a GitHub/GitLab source, for the avatar. */
export function sourceOwner(skill: Skill): { host: "github" | "gitlab"; owner: string } | null {
  const lock = skill.lock;
  if (lock === undefined) return null;
  if (lock.sourceType !== "github" && lock.sourceType !== "gitlab") return null;
  const owner = lock.source.split("/")[0];
  return owner === undefined || owner === "" ? null : { host: lock.sourceType, owner };
}

/**
 * The avatar of a GitHub/GitLab owner, falling back to a letter tile when
 * there is no owner or the image fails to load (offline, blocked).
 */
export function OwnerAvatar({ owner, host = "github", letter, size = 28 }: { owner: string | null; host?: "github" | "gitlab"; letter: string; size?: number }) {
  const { c } = useSkin();
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: 6, backgroundColor: c.surface2 } as const;
  if (owner === null || owner === "" || failed) {
    return (
      <View style={[box, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: c.foregroundMuted, fontSize: Math.max(9, size * 0.42), fontWeight: "600" }}>{letter.slice(0, 1).toUpperCase()}</Text>
      </View>
    );
  }
  const uri = host === "github" ? `https://github.com/${owner}.png?size=64` : `https://gitlab.com/${owner}.png?width=64`;
  return <Image source={{ uri }} onError={() => setFailed(true)} style={[box, { overflow: "hidden" }]} accessibilityIgnoresInvertColors />;
}

/** A skill has no logo of its own in the Agent Skills spec, so we show its source owner's avatar. */
export function SkillLogo({ skill, size = 28 }: { skill: Skill; size?: number }) {
  const owner = sourceOwner(skill);
  return <OwnerAvatar owner={owner?.owner ?? null} host={owner?.host} letter={skill.name} size={size} />;
}

export type SkillHealth = "synced" | "drifted" | "update" | "unmanaged" | "partial" | "broken";

/** Roll a skill's per-agent states and update check into one badge. */
export function skillHealth(skill: Skill, agents: Agent[]): { health: SkillHealth; label: string; tone: Tone } {
  const states = agents.map((agent) => skill.cells[agent.id]?.state ?? "missing");
  if (states.includes("broken")) return { health: "broken", label: "Broken", tone: "danger" };
  if (!skill.inHub) return { health: "unmanaged", label: "Not in hub", tone: "muted" };
  if (skill.update?.state === "update-available" || skill.update?.state === "modified-and-update") {
    return { health: "update", label: "Update available", tone: "primary" };
  }
  if (states.some(isDrifted)) return { health: "drifted", label: "Drifted", tone: "warning" };
  const missing = states.filter((state) => state === "missing").length;
  if (missing === agents.length && agents.length > 0) return { health: "partial", label: "Not installed", tone: "muted" };
  if (missing > 0) return { health: "partial", label: `Missing in ${missing}`, tone: "attention" };
  return { health: "synced", label: "In sync", tone: "success" };
}

export function SkillStatus({ skill, agents }: { skill: Skill; agents: Agent[] }) {
  const { label, tone } = skillHealth(skill, agents);
  return <Pill tone={tone}>{label}</Pill>;
}

/** A chevron that points right when closed and down when open. */
export function Chevron({ open }: { open: boolean }) {
  const { c } = useSkin();
  return <Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} color={c.foregroundMuted} />;
}
