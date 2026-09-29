// The Skills sidebar page: two tabs (Installed, Find skills) and a
// full-height reader mode.
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Empty, Segmented, SkinProvider, T } from "./components/primitives";
import { SkillReader } from "./components/skill-reader";
import { useApi } from "./hooks/use-api";
import { useMutations } from "./hooks/use-mutations";
import { useStatus } from "./hooks/use-status";
import { FindPage } from "./pages/find";
import { InstalledPage } from "./pages/installed";

type Tab = "installed" | "find";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "installed", label: "Installed" },
  { key: "find", label: "Find skills" },
];

function SkillsPage({ compact }: { compact: boolean }) {
  const api = useApi();
  const { status, error, refetch } = useStatus(api);
  const mutations = useMutations(api, refetch);
  const [tab, setTab] = useState<Tab>("installed");
  const [reading, setReading] = useState<string | null>(null);
  const pad = compact ? 16 : 24;

  if (reading !== null && status !== null) {
    // Reader mode: the page does not scroll; its panes do.
    return (
      <View style={{ flex: 1, padding: pad, width: "100%", maxWidth: 1152, alignSelf: "center" }}>
        <SkillReader initial={reading} status={status} api={api} onClose={() => setReading(null)} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: pad, paddingBottom: 32, width: "100%", maxWidth: 1024, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Segmented value={tab} options={TABS} onChange={setTab} />
        {status !== null ? (
          <T kind="muted" size={12}>
            {status.skills.length} skills · {status.agents.filter((agent) => agent.exists).length} agents
          </T>
        ) : null}
      </View>
      {error !== null ? (
        <T kind="danger" size={13} style={{ marginBottom: 12 }}>
          {error}
        </T>
      ) : null}
      {status === null ? (
        error === null ? <Empty>Scanning skills…</Empty> : null
      ) : tab === "installed" ? (
        <InstalledPage status={status} api={api} mutations={mutations} refetch={refetch} onOpen={setReading} />
      ) : (
        <FindPage status={status} api={api} mutations={mutations} />
      )}
    </ScrollView>
  );
}

export function SkillsSurface({ theme, layout }: PluginSurfaceProps) {
  return (
    <SkinProvider skin={{ theme, layout }}>
      <View style={{ flex: 1, backgroundColor: theme.colors.surface0 }}>
        <SkillsPage compact={layout.compact} />
      </View>
    </SkinProvider>
  );
}
