// Every RPC as one typed object, so components call `api.sync(…)` without
// knowing about Paseo's per-contract hooks.
import { useRpc } from "@getpaseo/plugin/client";
import { useMemo } from "react";
import { rpc } from "../../shared/contract";
import type { Api } from "../lib/types";

export function useApi(): Api {
  const status = useRpc(rpc.status);
  const sync = useRpc(rpc.sync);
  const remove = useRpc(rpc.remove);
  const adopt = useRpc(rpc.adopt);
  const diff = useRpc(rpc.diff);
  const install = useRpc(rpc.install);
  const setSource = useRpc(rpc.setSource);
  const checkUpdates = useRpc(rpc.checkUpdates);
  const update = useRpc(rpc.update);
  const setTags = useRpc(rpc.setTags);
  const skillFiles = useRpc(rpc.skillFiles);
  const skillFile = useRpc(rpc.skillFile);
  const registrySearch = useRpc(rpc.registrySearch);
  const registryDetail = useRpc(rpc.registryDetail);
  return useMemo(
    () => ({ status, sync, remove, adopt, diff, install, setSource, checkUpdates, update, setTags, skillFiles, skillFile, registrySearch, registryDetail }),
    [status, sync, remove, adopt, diff, install, setSource, checkUpdates, update, setTags, skillFiles, skillFile, registrySearch, registryDetail],
  );
}
