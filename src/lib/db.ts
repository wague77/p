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

const FAVORITES = "favoris";

function ensureDb() {
  const db = window.nova?.db;
  if (!db || typeof db.list !== "function") {
    throw new Error("La base partagée n'est pas disponible pour le moment.");
  }
  return db;
}

export async function listFavorites(): Promise<DbRow<FavoriteCourse>[]> {
  const db = ensureDb();
  const rows = await db.list(FAVORITES);
  return Array.isArray(rows) ? (rows as DbRow<FavoriteCourse>[]) : [];
}

export async function addFavorite(data: FavoriteCourse): Promise<DbRow<FavoriteCourse>> {
  const db = ensureDb();
  const row = await db.insert(FAVORITES, {
    date: String(data?.date ?? ""),
    reunion: Number(data?.reunion ?? 0),
    course: Number(data?.course ?? 0),
    hippodrome: String(data?.hippodrome ?? ""),
    libelle: String(data?.libelle ?? ""),
    heure: String(data?.heure ?? ""),
  });
  return row as DbRow<FavoriteCourse>;
}

export async function removeFavorite(id: string): Promise<void> {
  const db = ensureDb();
  await db.remove(FAVORITES, String(id ?? ""));
}
