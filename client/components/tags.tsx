// Tag chips and the tag filter row. Assigning tags lives in tag-picker.tsx.
import { Icon } from "@getpaseo/plugin/client/react-native";
import { Pressable, Text, View } from "react-native";
import { alpha } from "../lib/meta";
import { useSkin } from "./primitives";

export const UNTAGGED = "__untagged__";

export function TagChip({ tag, small = false }: { tag: string; small?: boolean }) {
  const { c } = useSkin();
  return (
    <View style={{ height: small ? 16 : 20, paddingHorizontal: small ? 6 : 8, borderRadius: 10, backgroundColor: c.surface2, justifyContent: "center" }}>
      <Text style={{ color: c.foregroundMuted, fontSize: small ? 10 : 11 }}>{tag}</Text>
    </View>
  );
}

/** Row of tag filters. `selected` is a tag, UNTAGGED, or null for all. */
export function TagFilter({
  tags,
  untaggedCount,
  selected,
  onSelect,
}: {
  tags: Array<{ tag: string; count: number }>;
  untaggedCount: number;
  selected: string | null;
  onSelect: (tag: string | null) => void;
}) {
  const { c } = useSkin();
  if (tags.length === 0) return null;
  const chip = (key: string, label: string, count: number) => {
    const active = selected === key;
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}, ${count} skills`}
        onPress={() => onSelect(active ? null : key)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 24,
          paddingHorizontal: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: active ? alpha(c.accent, 0.6) : c.border,
          backgroundColor: active ? c.surface2 : "transparent",
        }}
      >
        <Text style={{ fontSize: 11, color: active ? c.foreground : c.foregroundMuted }}>{label}</Text>
        <Text style={{ fontSize: 11, color: c.foregroundMuted, opacity: 0.6 }}>{count}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <Icon name="Folder" size={14} color={c.foregroundMuted} />
      {tags.map((entry) => chip(entry.tag, entry.tag, entry.count))}
      {untaggedCount > 0 ? chip(UNTAGGED, "untagged", untaggedCount) : null}
    </View>
  );
}
