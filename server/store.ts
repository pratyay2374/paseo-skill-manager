// Plugin state that is not skill files: tags, cached update checks and
// registry figures. Paseo gives plugins no key-value store, so this is one
// JSON file beside the daemon's own data, written atomically.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export function defaultStatePath(): string {
  const home = process.env.PASEO_HOME ?? path.join(os.homedir(), ".paseo");
  return path.join(home, "plugin-data", "skill-manager", "state.json");
}

export class JsonStore {
  private data: Record<string, unknown> | null = null;
  private writing: Promise<void> = Promise.resolve();

  constructor(private readonly file: string = defaultStatePath()) {}

  private load(): Record<string, unknown> {
    if (this.data !== null) return this.data;
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(this.file, "utf8"));
      this.data = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      this.data = {};
    }
    return this.data;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.load()[key] as T | undefined;
  }

  /** Set one key and persist. Writes are serialized so concurrent sets never interleave. */
  async set(key: string, value: unknown): Promise<void> {
    this.load()[key] = value;
    const snapshot = JSON.stringify(this.data, null, 2);
    // A failed write must not poison the chain for the next one.
    this.writing = this.writing.catch(() => undefined).then(() => {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const temp = `${this.file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, snapshot);
      fs.renameSync(temp, this.file);
    });
    return this.writing;
  }
}
