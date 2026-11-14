import "server-only";
import { LocalFileStorage } from "./local";
import type { FileStorage } from "./types";

let storage: FileStorage | undefined;

/** Local disk for now; another backend can implement FileStorage once hosting is decided. */
export function getFileStorage(): FileStorage {
  storage ??= new LocalFileStorage(process.env.PRIVATE_STORAGE_DIR || undefined);
  return storage;
}

export type { FileStorage } from "./types";
