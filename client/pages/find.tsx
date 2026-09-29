// The Find skills tab: search skills.sh, preview, install into the hub and
// chosen agents. Also accepts a raw source (owner/repo@skill, URL, path).
// skills.sh's public API has no trending list, so the tab starts empty.
import { openExternalUrl } from "@getpaseo/plugin/client";
import { Icon, useToast } from "@getpaseo/plugin/client/react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AgentLogo, Button, Chevron, Empty, Field, MONO, OwnerAvatar, Panel, Segmented, T, useSkin } from "../components/primitives";
import type { Mutations } from "../hooks/use-mutations";
import { describeError, formatCount } from "../lib/format";
import { alpha } from "../lib/meta";
import type { Agent, Api, RegistrySkill, Status } from "../lib/types";

function looksLikeSource(text: string): boolean {
  return /^(https?:\/\/|git@|\.{1,2}[\\/]|[\\/]|~|[A-Za-z]:[\\/])/.test(text) || /^[\w.-]+\/[\w.-]+(@[\w-]+|\/[\w./-]+)?$/.test(text);
}

function AgentPicker({ agents, chosen, onChange }: { agents: Agent[]; chosen: Set<string>; onChange: (next: Set<string>) => void }) {
  const { c } = useSkin();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <T kind="muted" size={12}>
        Install into
      </T>
      {agents.map((agent) => {
        const on = chosen.has(agent.id);
        return (
          <Pressable
            key={agent.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={agent.label}
            onPress={() => {
              const next = new Set(chosen);
              if (on) next.delete(agent.id);
              else next.add(agent.id);
              onChange(next);
            }}
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
              opacity: on ? 1 : 0.55,
            }}
          >
            <AgentLogo agent={agent} size={13} />
            <Text style={{ fontSize: 12, color: c.foreground }}>{agent.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ResultRow({ skill, installed, api, onInstall, busy, last }: { skill: RegistrySkill; installed: boolean; api: Api; onInstall: () => void; busy: boolean; last: boolean }) {
  const { c } = useSkin();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const togglePreview = async () => {
    if (preview !== null) return setPreview(null);
    setLoading(true);
    try {
      const detail = await api.registryDetail({ id: skill.id });
      setPreview(detail.files.map((file) => file.contents).join("\n\n") || "No preview available.");
    } catch (cause) {
      toast.error(describeError(cause));
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <OwnerAvatar owner={skill.source.split("/")[0] ?? null} letter={skill.name} size={32} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <T size={14} weight="500">
              {skill.name}
            </T>
            <T kind="mono" size={11}>
              {skill.source}
            </T>
          </View>
          {skill.summary !== null ? (
            <T kind="muted" size={12}>
              {skill.summary}
            </T>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <T kind="muted" size={11}>
              {formatCount(skill.installs)} installs
            </T>
            {skill.stars !== null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Icon name="Star" size={12} color={c.statusWarning} />
                <T kind="muted" size={11}>
                  {formatCount(skill.stars)}
                </T>
              </View>
            ) : null}
            <Pressable accessibilityRole="link" onPress={() => void openExternalUrl(skill.url)}>
              <Text style={{ fontSize: 11, color: c.foregroundMuted, textDecorationLine: "underline" }}>skills.sh</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Button small label={preview === null ? "Preview" : "Hide"} disabled={loading} onPress={() => void togglePreview()} />
          <Button small variant="default" label={installed ? "Installed" : "Install"} disabled={busy || installed} onPress={onInstall} />
        </View>
      </View>
      {preview !== null ? (
        <ScrollView nestedScrollEnabled style={{ marginTop: 8, maxHeight: 288, borderWidth: 1, borderColor: c.border, borderRadius: 6, backgroundColor: c.surface0 }} contentContainerStyle={{ padding: 12 }}>
          <Text selectable style={{ fontFamily: MONO, fontSize: 12, color: c.foreground }}>
            {preview}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

export function FindPage({ status, api, mutations }: { status: Status; api: Api; mutations: Mutations }) {
  const { c } = useSkin();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<RegistrySkill[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(status.agents.filter((a) => a.active).map((a) => a.id)));
  const [grouped, setGrouped] = useState<"flat" | "grouped">("flat");
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggleGroup = (source: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });

  /** Results grouped by repo, in order of first appearance so ranking is preserved. */
  const groups = useMemo(() => {
    if (results === null) return [];
    const map = new Map<string, RegistrySkill[]>();
    for (const skill of results) {
      const list = map.get(skill.source);
      if (list === undefined) map.set(skill.source, [skill]);
      else list.push(skill);
    }
    return [...map.entries()].map(([source, skills]) => ({ source, owner: source.split("/")[0] ?? null, skills }));
  }, [results]);

  const agents = status.agents.filter((agent) => agent.active);
  const hubNames = new Set(status.skills.filter((skill) => skill.inHub).map((skill) => skill.name));
  const isInstalled = (skill: RegistrySkill) => hubNames.has(skill.name) || hubNames.has(skill.skillId);

  const search = useCallback(
    async (text: string, nextPage: number) => {
      setSearching(true);
      try {
        const result = await api.registrySearch({ query: text, page: nextPage });
        setResults((current) => (nextPage === 1 || current === null ? result.skills : [...current, ...result.skills]));
        setHasMore(result.hasMore);
        setPage(result.page);
      } catch (cause) {
        toast.error(describeError(cause));
      } finally {
        setSearching(false);
      }
    },
    [api, toast],
  );

  const submit = () => {
    const text = query.trim();
    if (text.length < 2) return;
    setSubmitted(text);
    void search(text, 1);
  };

  const installSource = (source: string) => void mutations.install(source, [...chosen]);
  const directSource = query.trim();

  const list = (skills: RegistrySkill[]) => (
    <Panel>
      {skills.map((skill, index) => (
        <ResultRow key={skill.id} skill={skill} installed={isInstalled(skill)} api={api} busy={mutations.busy} onInstall={() => installSource(skill.id)} last={index === skills.length - 1} />
      ))}
    </Panel>
  );

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Field value={query} onChangeText={setQuery} placeholder="Search skills.sh, or paste owner/repo@skill, a GitHub URL, or a folder" onSubmit={submit} style={{ flexGrow: 1, flexBasis: 280, maxWidth: 576 }} />
        <Button icon="Search" variant="default" label="Search" disabled={searching || query.trim().length < 2} onPress={submit} />
        {looksLikeSource(directSource) ? <Button icon="Download" label="Install from source" disabled={mutations.busy} onPress={() => installSource(directSource)} /> : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <AgentPicker agents={agents} chosen={chosen} onChange={setChosen} />
        <View style={{ marginLeft: "auto" }}>
          <Segmented
            value={grouped}
            onChange={setGrouped}
            options={[
              { key: "flat", icon: "List", accessibilityLabel: "Flat list" },
              { key: "grouped", icon: "Layers", accessibilityLabel: "Group by source" },
            ]}
          />
        </View>
      </View>

      {results === null ? (
        <Panel>
          <Empty>{searching ? "Searching skills.sh…" : "Search skills.sh by name or topic, like “react” or “testing”."}</Empty>
        </Panel>
      ) : results.length === 0 ? (
        <Panel>
          <Empty>No results for “{submitted}”.</Empty>
        </Panel>
      ) : grouped === "grouped" ? (
        <View style={{ gap: 16 }}>
          {groups.map((group) => {
            const expanded = open.has(group.source);
            const installedCount = group.skills.filter(isInstalled).length;
            return (
              <View key={group.source} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => toggleGroup(group.source)}
                    style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}
                  >
                    <Chevron open={expanded} />
                    <OwnerAvatar owner={group.owner} letter={group.source} size={24} />
                    <T size={14} weight="500" numberOfLines={1}>
                      {group.source}
                    </T>
                    <Text style={{ fontSize: 12, color: c.foregroundMuted }}>
                      {group.skills.length}
                      {installedCount > 0 ? ` · ${installedCount} installed` : ""}
                    </Text>
                  </Pressable>
                  <Button
                    small
                    label={installedCount === group.skills.length ? "All installed" : "Install all"}
                    disabled={mutations.busy || installedCount === group.skills.length}
                    onPress={() => installSource(group.source)}
                  />
                </View>
                {expanded ? list(group.skills) : null}
              </View>
            );
          })}
        </View>
      ) : (
        list(results)
      )}
      {hasMore ? (
        <View style={{ alignItems: "center" }}>
          <Button label="Load more" disabled={searching} onPress={() => void search(submitted, page + 1)} />
        </View>
      ) : null}
      <T kind="muted" size={11}>
        Installing copies the skill into the hub, records its source in the lockfile, and links the chosen agents.
      </T>
    </View>
  );
}
