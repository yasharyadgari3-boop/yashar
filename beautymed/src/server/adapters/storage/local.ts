import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorage } from "./types";

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]*(\.[a-z0-9]+)?$/;

/** Stores files on the local disk, outside /public (default .data/private, git-ignored). */
export class LocalFileStorage implements FileStorage {
  constructor(private readonly root: string = path.join(process.cwd(), ".data", "private")) {}

  private resolve(key: string): string {
    if (!KEY_PATTERN.test(key) || key.includes("..") || key.includes("//")) {
      throw new Error("Invalid storage key");
    }
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { mode: 0o600 });
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
