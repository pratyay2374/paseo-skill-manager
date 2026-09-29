// Settings → Plugins → skill-manager. Text fields are drafts until Save;
// the install mode saves at once.
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useSettings } from "@getpaseo/plugin/client";
import { SettingsAction, SettingsCard, SettingsInput, SettingsSection, SettingsSelect } from "@getpaseo/plugin/client/ui";
import { useState } from "react";
import { Text } from "react-native";
import { preferences } from "../shared/settings";

type Values = (typeof preferences.schema)["_zod"]["output"];
type Draft = Pick<Values, "hubDir" | "disabledAgents" | "extraAgents">;

function extraAgentsError(text: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(text.trim() === "" ? "[]" : text);
    if (!Array.isArray(parsed)) return "Must be a JSON list";
    for (const item of parsed) {
      const entry = item as { id?: unknown; dir?: unknown } | null;
      if (typeof entry !== "object" || entry === null || typeof entry.id !== "string" || typeof entry.dir !== "string") {
        return "Each entry needs an id and a dir";
      }
    }
    return undefined;
  } catch {
    return "Not valid JSON";
  }
}

function Form({ values, revision, save, saving }: { values: Values; revision: string; save: (values: Values, revision: string) => Promise<boolean>; saving: boolean }) {
  const [draft, setDraft] = useState<Draft>({ hubDir: values.hubDir, disabledAgents: values.disabledAgents, extraAgents: values.extraAgents });
  const extraError = extraAgentsError(draft.extraAgents);
  const hubError = draft.hubDir.trim() === "" ? "Required" : undefined;
  const dirty = draft.hubDir !== values.hubDir || draft.disabledAgents !== values.disabledAgents || draft.extraAgents !== values.extraAgents;
  return (
    <SettingsSection title="Skills">
      <SettingsCard>
        <SettingsInput
          label="Hub folder"
          hint="Where the one shared copy of every skill lives."
          error={hubError}
          initialValue={values.hubDir}
          placeholder="~/.agents/skills"
          onChangeText={(hubDir) => setDraft((current) => ({ ...current, hubDir }))}
        />
        <SettingsSelect
          label="Install as"
          hint="A link keeps every agent on the hub copy; a copy lets an agent drift."
          value={values.defaultMode}
          options={[
            { label: "Link", value: "link" },
            { label: "Copy", value: "copy" },
          ]}
          onValueChange={(mode) => void save({ ...values, defaultMode: mode === "copy" ? "copy" : "link" }, revision)}
        />
        <SettingsInput
          label="Hidden agents"
          hint="Comma-separated ids, e.g. gemini, copilot"
          initialValue={values.disabledAgents}
          placeholder="none"
          onChangeText={(disabledAgents) => setDraft((current) => ({ ...current, disabledAgents }))}
        />
        <SettingsInput
          label="More agents"
          hint='JSON list, e.g. [{"id":"zed","label":"Zed","dir":"~/.zed/skills"}]'
          error={extraError}
          initialValue={values.extraAgents}
          placeholder="[]"
          onChangeText={(extraAgents) => setDraft((current) => ({ ...current, extraAgents }))}
        />
        <SettingsAction
          label="Save changes"
          actionLabel={saving ? "Saving…" : "Save"}
          disabled={!dirty || saving || extraError !== undefined || hubError !== undefined}
          onPress={() => void save({ ...values, ...draft, hubDir: draft.hubDir.trim() }, revision)}
        />
      </SettingsCard>
    </SettingsSection>
  );
}

export function SkillManagerSettings({ theme }: PluginSurfaceProps) {
  const settings = useSettings(preferences);
  if (settings.status === "loading") return <Text style={{ color: theme.colors.foregroundMuted }}>Loading…</Text>;
  if (settings.status === "error") return <Text style={{ color: theme.colors.statusDanger }}>{settings.error}</Text>;
  if (settings.status === "invalid") return <Text style={{ color: theme.colors.statusDanger }}>Saved settings are invalid: {settings.error}</Text>;
  return (
    <>
      {/* Re-mount on a new revision so drafts start from what was saved. */}
      <Form key={settings.revision} values={settings.values} revision={settings.revision} save={settings.save} saving={settings.saving} />
      {settings.saveError !== null ? <Text style={{ color: theme.colors.statusDanger }}>{settings.saveError}</Text> : null}
    </>
  );
}
