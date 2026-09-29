import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { Text, View } from "react-native";
import type { DiffResponse } from "../lib/types";
import { MONO, T, useSkin } from "./primitives";

export function DiffView({ diff }: { diff: DiffResponse }) {
  const { c } = useSkin();
  if (diff.files.length === 0) return <T kind="muted" size={12}>No differences.</T>;
  const lineColor = (line: string) =>
    line.startsWith("- ") ? c.statusDanger : line.startsWith("+ ") ? c.statusSuccess : line === "@@" ? c.foregroundMuted : c.foreground;
  return (
    <ScrollView
      style={{ maxHeight: 320, borderWidth: 1, borderColor: c.border, borderRadius: 6, backgroundColor: c.surface0 }}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      nestedScrollEnabled
    >
      {diff.files.map((file) => (
        <View key={file.path}>
          <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: "600", color: c.foreground }}>
            <Text style={{ color: c.foregroundMuted }}>{file.status}</Text> {file.path}
          </Text>
          {file.diff !== undefined ? (
            <View style={{ marginTop: 4 }}>
              {file.diff.split("\n").map((line, index) => (
                <Text key={index} selectable style={{ fontFamily: MONO, fontSize: 12, color: lineColor(line) }}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
