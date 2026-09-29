// Client-side type aliases derived from the shared contract.
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { Rpcs } from "../../shared/contract";

/** One typed async function per RPC method. */
export type Api = { [Name in keyof Rpcs]: (input: RpcInput<Rpcs[Name]>) => Promise<RpcOutput<Rpcs[Name]>> };

export type {
  AgentStatusResponse as Agent,
  CellState,
  DiffResponse,
  InstallResultResponse as InstallResult,
  OpResultResponse as OpResult,
  RegistrySkillResponse as RegistrySkill,
  SkillRowResponse as Skill,
  StatusResponse as Status,
  SyncMode,
  UpdateCheckResponse as UpdateCheck,
  UpdateState,
} from "../../shared/contract";
