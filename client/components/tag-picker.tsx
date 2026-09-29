// Label-picker pattern in a Paseo modal: a searchable list of every tag in
// use. Tap a row to toggle it on the skill; type a new name and submit to
// create it. Changes apply immediately.
import { Icon, Modal } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Mutations } from "../hooks/use-mutations";
import { Field, T, useSkin } from "./primitives";

const TAG = /^[a-z0-9][a-z0-9._-]{0,31}$/;

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function TagPicker({
  skill,
  tags,
  allTags,
  mutations,
  open,
  onOpenChange,
}: {
  skill: string;
  tags: string[];
  allTags: Array<{ tag: string; count: number }>;
  mutations: Mutations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { c } = useSkin();
  const [query, setQuery] = useState("");

  const needle = normalize(query);
  const rows = useMemo(() => {
    const merged = [...new Set([...tags, ...allTags.map((entry) => entry.tag)])].sort();
    return needle === "" ? merged : merged.filter((tag) => tag.includes(needle));
  }, [allTags, tags, needle]);
  const canCreate = needle !== "" && TAG.test(needle) && !rows.includes(needle);
  const options = canCreate ? [...rows, needle] : rows;

  const toggle = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    void mutations.setTags(skill, next);
    setQuery("");
  };

  return (
    <Modal
      title={`Tags for ${skill}`}
      icon={<Icon name="Tag" size={18} color={c.foreground} />}
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <Modal.Content>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder={allTags.length === 0 ? "Name a tag" : "Search or create a tag"}
          onSubmit={() => {
            const pick = options[0];
            if (pick !== undefined) toggle(pick);
          }}
          autoFocus
        />
        {options.length === 0 ? (
          <T kind="muted" size={12}>
            Type a name to create a tag
          </T>
        ) : (
          <View style={{ gap: 2 }}>
            {options.map((tag, index) => {
              const on = tags.includes(tag);
              const creating = canCreate && index === options.length - 1;
              return (
                <Pressable
                  key={tag}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: mutations.busy }}
                  disabled={mutations.busy}
                  onPress={() => toggle(tag)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    backgroundColor: pressed ? c.surface2 : "transparent",
                  })}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: on ? c.accent : c.border,
                      backgroundColor: on ? c.accent : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {on ? <Icon name="Check" size={12} color={c.accentForeground} /> : null}
                  </View>
                  <Text style={{ fontSize: 14, color: c.foreground }} numberOfLines={1}>
                    {creating ? <Text style={{ color: c.foregroundMuted }}>Create </Text> : null}
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Modal.Content>
    </Modal>
  );
}
