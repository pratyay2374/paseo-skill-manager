// Plugin settings, stored by Paseo on the daemon host and edited under
// Settings → Plugins → skill-manager.
import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const preferences = defineSettings({
  id: "preferences",
  scope: "host",
  version: 1,
  schema: z.object({
    /** Canonical skills directory; agents get links or copies of it. */
    hubDir: z.string().trim().min(1).default("~/.agents/skills"),
    defaultMode: z.enum(["link", "copy"]).default("link"),
    /** Comma-separated agent ids to hide. */
    disabledAgents: z.string().default(""),
    /** JSON array of { id, label, dir, readsHub? }. */
    extraAgents: z.string().default("[]"),
  }),
});
