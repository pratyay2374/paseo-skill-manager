// RPC handlers for the Skills page. Thin: parse nothing, delegate everything.
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { rpc } from "../shared/contract";
import type { SkillService } from "./service";

export function registerRpc(server: PluginServerContext, service: SkillService): void {
  server.handle(rpc.status, () => service.status());
  server.handle(rpc.sync, async ({ skills, agents, mode, force }) => ({
    results: await service.sync(skills, agents, mode, force ?? false),
  }));
  server.handle(rpc.remove, async ({ skill, agents, force }) => ({
    results: await service.remove(skill, agents, force ?? false),
  }));
  server.handle(rpc.adopt, ({ skill, from, force }) => service.adopt(skill, from, force ?? false));
  server.handle(rpc.diff, ({ skill, agent }) => service.diff(skill, agent));
  server.handle(rpc.install, async ({ source, agents, force }) => {
    const { installed } = await service.install(source, agents, force ?? false);
    return { results: installed };
  });
  server.handle(rpc.setSource, async ({ skill, source }) => ({ lock: await service.setSource(skill, source) }));
  server.handle(rpc.checkUpdates, async ({ skills }) => ({ checks: await service.checkUpdates(skills) }));
  server.handle(rpc.update, async ({ skills, force }) => ({ results: await service.update(skills, force ?? false) }));
  server.handle(rpc.setTags, async ({ skill, tags }) => ({ tags: await service.setTags(skill, tags) }));
  server.handle(rpc.skillFiles, ({ skill, agent }) => service.skillFiles(skill, agent));
  server.handle(rpc.skillFile, ({ skill, agent, path }) => service.skillFile(skill, agent, path));
  server.handle(rpc.registrySearch, ({ query, page }) => service.registrySearch(query, page));
  server.handle(rpc.registryDetail, ({ id }) => service.registryDetail(id));
}
