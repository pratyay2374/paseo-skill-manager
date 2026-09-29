// skills.sh and GitHub lookups. BB exposed these through its own SDK; under
// Paseo the plugin calls the public endpoints directly:
//   search   skills.sh/api/search (needs 2+ characters, no paging, max 200)
//   stars    api.github.com/repos/<owner>/<repo>
//   SKILL.md GitHub's tree API + raw.githubusercontent.com, or a shallow
//            clone when the API is unavailable (rate limit, non-GitHub host)
import { Fetcher, discoverSkills, parseSource, readFile, selectSkills } from "./core";
import { parseFrontmatter } from "./core/frontmatter";

const SEARCH_URL = "https://skills.sh/api/search";
const SITE = "https://www.skills.sh";
const TIMEOUT_MS = 15_000;
/** skills.sh returns at most this many results for one query. */
export const SEARCH_CAP = 200;

export interface RegistryEntry {
  id: string;
  source: string;
  skillId: string;
  name: string;
  installs: number;
  url: string;
}

interface SearchPayload {
  skills?: Array<{ id: string; source: string; skillId: string; name: string; installs: number }>;
  error?: string;
}

/** Default pause after a rate-limit answer that carries no Retry-After. */
const COOLDOWN_MS = 60_000;
/** Per host: no requests before this time, after the host said "too many requests". */
const blockedUntil = new Map<string, number>();

/** True while a host is cooling down after a rate-limit answer; background work should wait. */
export function coolingDown(host: "skills.sh" | "api.github.com"): boolean {
  return Date.now() < (blockedUntil.get(host) ?? 0);
}

function rateLimited(response: Response): boolean {
  return response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
}

function cooldownMs(response: Response): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) return Math.max(reset * 1000 - Date.now(), 1000);
  return COOLDOWN_MS;
}

/**
 * Fetch with a timeout. The public endpoints have no batch API, so a big hub
 * can trip their rate limits; after one rate-limit answer every request to
 * that host fails fast until the host's cooldown passes.
 */
async function request(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const host = new URL(url).host;
  const until = blockedUntil.get(host) ?? 0;
  if (Date.now() < until) {
    throw new Error(`${host} is rate-limiting requests; try again in ${Math.ceil((until - Date.now()) / 1000)}s`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (rateLimited(response)) {
      const wait = cooldownMs(response);
      blockedUntil.set(host, Date.now() + wait);
      throw new Error(`${host} is rate-limiting requests; try again in ${Math.ceil(wait / 1000)}s`);
    }
    if (!response.ok) throw new Error(`${host} answered ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  return (await (await request(url, headers)).json()) as T;
}

async function getText(url: string): Promise<string> {
  return (await request(url)).text();
}

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "paseo-skill-manager",
    ...(token !== undefined && token !== "" ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function registryUrl(id: string): string {
  return `${SITE}/${id}`;
}

/** Search skills.sh. Queries shorter than two characters return nothing. */
export async function search(query: string, limit: number): Promise<RegistryEntry[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const params = new URLSearchParams({ q: text, limit: String(Math.min(limit, SEARCH_CAP)) });
  const payload = await getJson<SearchPayload>(`${SEARCH_URL}?${params}`);
  if (payload.error !== undefined) throw new Error(payload.error);
  return (payload.skills ?? []).map((skill) => ({ ...skill, url: registryUrl(skill.id) }));
}

/** The registry entry for an exact id (`owner/repo/skillId`), or null when skills.sh does not list it. */
export async function entry(id: string): Promise<RegistryEntry | null> {
  const skillId = id.split("/").slice(2).join("/");
  if (skillId === "") return null;
  const results = await search(skillId, 50);
  return results.find((candidate) => candidate.id === id) ?? null;
}

/** GitHub star count for `owner/repo`. */
export async function repositoryStars(source: string): Promise<number> {
  const [owner, repo] = source.split("/");
  if (owner === undefined || repo === undefined) throw new Error(`not a GitHub repository: ${source}`);
  const payload = await getJson<{ stargazers_count?: number }>(`https://api.github.com/repos/${owner}/${repo}`, githubHeaders());
  if (typeof payload.stargazers_count !== "number") throw new Error(`no star count for ${source}`);
  return payload.stargazers_count;
}

/** SKILL.md of one registry skill, looked up through GitHub's API. */
async function skillMdFromApi(source: string, skillId: string): Promise<string> {
  const [owner, repo] = source.split("/");
  const tree = await getJson<{ tree?: Array<{ path: string; type: string }> }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    githubHeaders(),
  );
  const paths = (tree.tree ?? []).filter((node) => node.type === "blob" && /(^|\/)SKILL\.md$/.test(node.path)).map((node) => node.path);
  const raw = (file: string) => getText(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file}`);
  // The skills.sh id is usually the directory name; otherwise it is the frontmatter name.
  const byDir = paths.find((file) => file.split("/").at(-2) === skillId) ?? (paths.length === 1 ? paths[0] : undefined);
  if (byDir !== undefined) return raw(byDir);
  for (let index = 0; index < paths.length; index += 8) {
    const batch = await Promise.all(paths.slice(index, index + 8).map(async (file) => ({ file, text: await raw(file) })));
    const hit = batch.find(({ text }) => parseFrontmatter(text).name === skillId);
    if (hit !== undefined) return hit.text;
  }
  throw new Error(`no skill named "${skillId}" in ${source}`);
}

/** SKILL.md of one registry skill from a shallow clone. */
async function skillMdFromClone(source: string, skillId: string): Promise<string> {
  const fetcher = new Fetcher();
  try {
    const spec = parseSource(`${source}@${skillId}`);
    const checkout = await fetcher.checkout(spec);
    const [skill] = selectSkills(discoverSkills(checkout.root), spec.selector);
    if (skill === undefined) throw new Error(`no skill named "${skillId}" in ${source}`);
    return readFile(skill.dir, "SKILL.md").content;
  } finally {
    fetcher.dispose();
  }
}

/**
 * The files of a registry skill worth previewing: its SKILL.md. A shallow
 * clone backs up the GitHub API only when `allowClone` is set, which user
 * previews do and background matching does not.
 */
export async function detail(source: string, skillId: string, allowClone = true): Promise<Array<{ path: string; contents: string }>> {
  let contents: string;
  try {
    contents = await skillMdFromApi(source, skillId);
  } catch (cause) {
    if (!allowClone) throw cause;
    contents = await skillMdFromClone(source, skillId);
  }
  return [{ path: "SKILL.md", contents }];
}
