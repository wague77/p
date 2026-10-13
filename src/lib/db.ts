declare global {
  interface Window {
    nova?: {
      fetch?: typeof fetch;
      db?: {
        list(c: string): Promise<DbRow[]>;
        insert(c: string, d: unknown): Promise<DbRow>;
        update(c: string, id: string, d: unknown): Promise<DbRow>;
        remove(c: string, id: string): Promise<void>;
      };
    };
  }
}

export interface DbRow<T = unknown> {
  id: string;
  data: T;
  created_at?: string;
}

export interface FavoriteCourse {
  date: string;
  reunion: number;
  course: number;
  hippodrome: string;
  libelle: string;
  heure: string;
  note?: string;
}

const FAVORITES = "partants-pmu-favoris";

function storageKey(): string {
  return FAVORITES;
}

function readLocal(): DbRow<FavoriteCourse>[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DbRow<FavoriteCourse>[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: DbRow<FavoriteCourse>[]): void {
  localStorage.setItem(storageKey(), JSON.stringify(Array.isArray(rows) ? rows : []));
}

function ensureDb() {
  const db = window.nova?.db;
  if (!db || typeof db.list !== "function" || typeof db.insert !== "function" || typeof db.remove !== "function") {
    return null;
  }
  return db;
}

export async function listFavorites(): Promise<DbRow<FavoriteCourse>[]> {
  const db = ensureDb();
  if (!db) return readLocal();
  try {
    const rows = await db.list(FAVORITES);
    return Array.isArray(rows) ? (rows as DbRow<FavoriteCourse>[]) : [];
  } catch {
    return readLocal();
  }
}

export async function addFavorite(data: FavoriteCourse): Promise<DbRow<FavoriteCourse>> {
  const payload: FavoriteCourse = {
    date: String(data?.date ?? ""),
    reunion: Number(data?.reunion ?? 0),
    course: Number(data?.course ?? 0),
    hippodrome: String(data?.hippodrome ?? ""),
    libelle: String(data?.libelle ?? ""),
    heure: String(data?.heure ?? ""),
  };
  const db = ensureDb();
  if (db) {
    try {
      const row = await db.insert(FAVORITES, payload);
      return row as DbRow<FavoriteCourse>;
    } catch {
      /* repli local */
    }
  }
  const row: DbRow<FavoriteCourse> = {
    id: "local-" + String(Date.now()),
    data: payload,
    created_at: new Date().toISOString(),
  };
  const next = readLocal().concat(row);
  writeLocal(next);
  return row;
}

export async function removeFavorite(id: string): Promise<void> {
  const safeId = String(id ?? "");
  const db = ensureDb();
  if (db && safeId.indexOf("local-") !== 0) {
    try {
      await db.remove(FAVORITES, safeId);
      return;
    } catch {
      /* repli local */
    }
  }
  writeLocal(readLocal().filter((row) => String(row?.id ?? "") !== safeId));
}
