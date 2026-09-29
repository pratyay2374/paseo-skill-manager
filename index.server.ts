// Skill Manager — daemon entry.
//
// One hub directory (default ~/.agents/skills) holds the canonical copy of
// every skill, and `skills-lock.json` beside it records where each came
// from. Coding agents get a symlink or copy in their own skills directory.
//
// This file only wires things together:
//   context.ts   settings and cached state
//   service.ts   the operations, built on ./core
//   registry.ts  skills.sh and GitHub lookups
//   rpc.ts       handlers for the Skills page
//
// File I/O runs on the machine that hosts the Paseo daemon and targets its
// home directory.
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { Context } from "./server/context";
import { registerRpc } from "./server/rpc";
import { SkillService } from "./server/service";
import { JsonStore } from "./server/store";
import { preferences } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(preferences);
  const context = new Context(settings, new JsonStore());
  const service = new SkillService(context);
  registerRpc(server, service);
  // A settings change moves the hub or the agent list: drop cached payloads.
  const unsubscribe = settings.subscribe(() => context.announce());
  return () => {
    unsubscribe();
  };
}
