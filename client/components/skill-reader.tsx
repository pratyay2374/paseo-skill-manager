// Reader: a skill list on the left (the selected skill expands to show its
// files), the selected file on the right. On compact screens the file list
// sits above the file. Paseo gives plugins no Markdown renderer, so every
// file shows as selectable monospace text.
import { Icon, ScrollView, useToast } from "@getpaseo/plugin/client/react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView as NativeScrollView, Text, View } from "react-native";
import { describeError, formatBytes, homeOf, tildify } from "../lib/format";
import { alpha } from "../lib/meta";
import type { Agent, Api, Skill, Status } from "../lib/types";
import { AgentLogo, Button, Field, MONO, Panel, SkillLogo, T, useSkin } from "./primitives";

interface FileEntry {
  path: string;
  sizeBytes: number;
}

interface Loaded {
  path: string;
  content: string;
  truncated: boolean;
  binary: boolean;
}

/** Agents whose copy can be opened: real directories, not hub links or via-hub. */
function readableAgents(skill: Skill, agents: Agent[]): Agent[] {
  return agents.filter((agent) => {
    const state = skill.cells[agent.id]?.state ?? "missing";
    return state === "same" || state === "modified" || state === "unmanaged" || state === "external-link";
  });
}

function readable(skill: Skill): boolean {
  return skill.inHub || Object.values(skill.cells).some((cell) => cell.state !== "missing" && cell.state !== "hub" && cell.state !== "broken");
}

function Toggle({ label, on, disabled, onPress, agent }: { label: string; on: boolean; disabled?: boolean; onPress: () => void; agent?: Agent }) {
  const { c } = useSkin();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 28,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: on ? alpha(c.accent, 0.6) : c.border,
        backgroundColor: on ? c.surface2 : "transparent",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {agent !== undefined ? <AgentLogo agent={agent} size={13} /> : null}
      <Text style={{ fontSize: 12, color: on ? c.foreground : c.foregroundMuted }}>{label}</Text>
    </Pressable>
  );
}

export function SkillReader({ initial, status, api, onClose }: { initial: string; status: Status; api: Api; onClose: () => void }) {
  const { c, layout } = useSkin();
  const toast = useToast();
  const [current, setCurrent] = useState(initial);
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState<string | null>(null);
  const [dir, setDir] = useState("");
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [selected, setSelected] = useState("SKILL.md");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const contentRef = useRef<NativeScrollView>(null);

  const skill = status.skills.find((candidate) => candidate.name === current) ?? status.skills[0];
  const copies = skill === undefined ? [] : readableAgents(skill, status.agents);
  const home = homeOf(status);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return status.skills.filter((candidate) => readable(candidate) && (needle === "" || candidate.name.includes(needle)));
  }, [status, query]);

  const pick = (name: string) => {
    if (name === current) return;
    setCurrent(name);
    setAgent(null);
    setSelected("SKILL.md");
  };

  // File list for the current skill and copy.
  useEffect(() => {
    if (skill === undefined) return;
    let cancelled = false;
    setFiles(null);
    api.skillFiles({ skill: skill.name, ...(agent === null ? {} : { agent }) }).then(
      (result) => {
        if (cancelled) return;
        setDir(result.dir);
        setFiles(result.files);
        if (!result.files.some((file) => file.path === selected)) {
          setSelected(result.files.some((file) => file.path === "SKILL.md") ? "SKILL.md" : (result.files[0]?.path ?? ""));
        }
      },
      (cause: unknown) => toast.error(describeError(cause)),
    );
    return () => {
      cancelled = true;
    };
    // `selected` is intentionally not a dependency: it is reconciled inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, skill?.name, agent]);

  // The selected file.
  useEffect(() => {
    if (skill === undefined || selected === "") return;
    let cancelled = false;
    api.skillFile({ skill: skill.name, path: selected, ...(agent === null ? {} : { agent }) }).then(
      (result) => {
        if (cancelled) return;
        setLoaded(result);
        contentRef.current?.scrollTo({ y: 0, animated: false });
      },
      (cause: unknown) => toast.error(describeError(cause)),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, skill?.name, agent, selected]);

  if (skill === undefined) return null;
  const showing = loaded !== null && loaded.path === selected ? loaded : null;

  const fileRow = (file: FileEntry) => {
    const on = selected === file.path;
    return (
      <Pressable
        key={file.path}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={file.path}
        onPress={() => setSelected(file.path)}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4, backgroundColor: on ? c.surface2 : "transparent" }}
      >
        <Icon name={/\.md$/i.test(file.path) ? "FileText" : "File"} size={12} color={on ? c.foreground : c.foregroundMuted} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: MONO, fontSize: 11, color: on ? c.foreground : c.foregroundMuted }}>
          {file.path}
        </Text>
        <Text style={{ fontSize: 11, color: c.foregroundMuted }}>{formatBytes(file.sizeBytes)}</Text>
      </Pressable>
    );
  };

  const fileList =
    files === null ? (
      <T kind="muted" size={11} style={{ padding: 6 }}>
        Loading…
      </T>
    ) : (
      files.map(fileRow)
    );

  const content = (
    <Panel style={{ flex: 1, minHeight: layout.compact ? 320 : 0 }}>
      <ScrollView ref={contentRef} contentContainerStyle={{ padding: 20 }}>
        {showing === null ? (
          <T kind="muted" size={12}>
            Loading…
          </T>
        ) : showing.binary ? (
          <T kind="muted" size={12}>
            Binary file, not shown.
          </T>
        ) : (
          <Text selectable style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18, color: c.foreground }}>
            {showing.content}
          </Text>
        )}
        {showing?.truncated ? (
          <T kind="muted" size={12} style={{ marginTop: 12 }}>
            File truncated at 512 KB.
          </T>
        ) : null}
      </ScrollView>
    </Panel>
  );

  return (
    <View style={{ flex: 1, minHeight: 0, gap: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <Button icon="ChevronLeft" variant="ghost" accessibilityLabel="Back to skills" onPress={onClose} />
        <SkillLogo skill={skill} size={32} />
        <View style={{ flex: 1, minWidth: 120 }}>
          <T size={14} weight="500" numberOfLines={1}>
            {skill.name}
          </T>
          <T kind="mono" size={11} numberOfLines={1}>
            {tildify(dir, home)}
          </T>
        </View>
        {copies.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            <Toggle label="hub" on={agent === null} disabled={!skill.inHub} onPress={() => setAgent(null)} />
            {copies.map((candidate) => (
              <Toggle key={candidate.id} label={candidate.label} agent={candidate} on={agent === candidate.id} onPress={() => setAgent(candidate.id)} />
            ))}
          </View>
        ) : null}
      </View>

      {layout.compact ? (
        <>
          <Panel style={{ padding: 4 }}>{fileList}</Panel>
          {content}
        </>
      ) : (
        <View style={{ flex: 1, minHeight: 0, flexDirection: "row", gap: 12 }}>
          {/* Left: skills, with the current one expanded into its files */}
          <Panel style={{ width: 240 }}>
            <View style={{ padding: 6, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Field value={query} onChangeText={setQuery} placeholder="Jump to a skill" />
            </View>
            <NativeScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 4 }}>
              {list.map((candidate) => {
                const active = candidate.name === skill.name;
                return (
                  <View key={candidate.name}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => pick(candidate.name)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4, backgroundColor: active ? c.surface2 : "transparent" }}
                    >
                      <SkillLogo skill={candidate} size={16} />
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: active ? c.foreground : c.foregroundMuted }}>
                        {candidate.name}
                      </Text>
                    </Pressable>
                    {active ? <View style={{ marginLeft: 12, marginBottom: 4, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: c.border }}>{fileList}</View> : null}
                  </View>
                );
              })}
            </NativeScrollView>
          </Panel>
          {/* Right: the file */}
          {content}
        </View>
      )}
    </View>
  );
}
