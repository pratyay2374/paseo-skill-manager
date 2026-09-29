// Skill Manager — app entry. Registers the Skills sidebar page and the
// plugin's settings screen.
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { SkillManagerSettings } from "./client/settings-screen";
import { SkillsSurface } from "./client/skills-surface";

export default function contribute(client: PluginClientContext) {
  client.addSurface("skills", SkillsSurface);
  client.addSidebarItem({ id: "skills", title: "Skills", icon: "GraduationCap", surface: "skills" });
  client.addSettingsScreen({ id: "preferences", title: "Skills", icon: "GraduationCap", Component: SkillManagerSettings });
  return () => {};
}
