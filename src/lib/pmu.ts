import type {
  ArriveeEntry,
  ArriveeOfficielle,
  Course,
  Pari,
  Participant,
  ParticipantsResponse,
  ProgrammeResponse,
  PronosticsDetaillesResponse,
  PronosticsResponse,
  Reunion,
  SelectionItem,
} from "./types";

declare global {
  interface Window {
    nova?: {
      fetch?: (input: string, init?: RequestInit) => Promise<Response>;
      db?: {
        list(c: string): Promise<Array<{ id: string; data: unknown; created_at?: string }>>;
        insert(c: string, d: unknown): Promise<{ id: string; data: unknown; created_at?: string }>;
        update(c: string, id: string, d: unknown): Promise<{ id: string; data: unknown }>;
        remove(c: string, id: string): Promise<void>;
      };
    };
  }
}

const OFFLINE = "https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/";
const ONLINE = "https://online.turfinfo.api.pmu.fr/rest/client/7/programme/";

function safeDate(input: Date | null | undefined): Date {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input;
  return new Date();
}

export function formatDateJJMMAAAA(date: Date | null | undefined): string {
  const d = safeDate(date);
  return (
    String(d.getDate()).padStart(2, "0") +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getFullYear())
  );
}

export function parseInputDate(value: string | null | undefined): Date {
  const raw = String(value ?? "");
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function toInputDate(date: Date | null | undefined): string {
  const d = safeDate(date);
  return (
    String(d.getFullYear()) +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function formatLongDate(date: Date | null | undefined): string {
  try {
    return safeDate(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return toInputDate(date);
  }
}

export function formatHeure(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string") {
    const text = String(value);
    if (text.indexOf("T") >= 0) {
      const parsed = new Date(text);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      }
    }
    const colon = text.indexOf(":");
    if (colon > 0) return text.slice(Math.max(0, colon - 2), colon + 3);
    const n = Number(text);
    if (!Number.isFinite(n)) return text || "—";
    return formatHeure(n);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n > 1e11) {
    const d = new Date(n);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (n >= 10000 && n < 240000) {
    const hh = Math.floor(n / 10000);
    const mm = Math.floor((n % 10000) / 100);
    if (hh < 24 && mm < 60) return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }
  if (n >= 0 && n < 2400) {
    const h = Math.floor(n / 100);
    const m = Math.round(n % 100);
    if (h < 24 && m < 60) return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  return String(value);
}

export function hippodromeLabel(reunion: Reunion | null | undefined): string {
  return String(reunion?.hippodrome?.libelleCourt || reunion?.hippodrome?.libelleLong || "Hippodrome").toUpperCase();
}

export function paysLabel(reunion: Reunion | null | undefined): string {
  const pays = reunion?.pays;
  if (!pays) return "";
  if (typeof pays === "string") return String(pays);
  return String(pays.libelle || pays.code || "");
}

export function cleanPariCode(code: string | undefined | null): string {
  return String(code ?? "").replace(/^E_/i, "").replace(/_/g, " ").trim();
}

export function pariLabel(code: string | undefined | null): string {
  const key = String(code ?? "").toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    SIMPLE_GAGNANT: "Simple gagnant",
    SIMPLE_PLACE: "Simple placé",
    COUPLE_GAGNANT: "Couplé gagnant",
    COUPLE_PLACE: "Couplé placé",
    COUPLE_ORDRE: "Couplé ordre",
    DEUX_SUR_QUATRE: "2 sur 4",
    TRIO: "Trio",
    TIERCE: "Tiercé",
    SUPER_QUATRE: "Super 4",
    QUARTE_PLUS: "Quarté+",
    MULTI: "Multi",
    QUINTE_PLUS: "Quinté+",
    PICK5: "Pick 5",
  };
  if (map[key]) return map[key];
  if (!code) return "Jeu";
  return String(code)
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function horsesForPari(code: string | undefined | null): number {
  const key = String(code ?? "").toUpperCase().replace(/\s+/g, "_");
  if (!key) return 0;
  if (key.indexOf("SIMPLE_GAGNANT") >= 0 || key.indexOf("SIMPLE_PLACE") >= 0) return 1;
  if (key.indexOf("COUPLE") >= 0 || key.indexOf("COUPL") >= 0 || key.indexOf("DEUX_SUR_QUATRE") >= 0 || key.indexOf("2SUR4") >= 0) return 2;
  if (key.indexOf("TRIO") >= 0 || key.indexOf("TIERC") >= 0) return 3;
  if (key.indexOf("SUPER") >= 0 || key.indexOf("QUARTE") >= 0 || key.indexOf("MULTI") >= 0) return 4;
  if (key.indexOf("QUINTE") >= 0 || key.indexOf("PICK5") >= 0 || key.indexOf("PICK_5") >= 0) return 5;
  return 0;
}

export function uniqueParis(paris: Pari[] | undefined | null): { code: string; label: string; count: number }[] {
  if (!Array.isArray(paris)) return [];
  const seen = new Set<string>();
  const out: { code: string; label: string; count: number }[] = [];
  for (const p of paris) {
    const raw = cleanPariCode(p?.codePari);
    const count = horsesForPari(raw);
    if (!raw || count <= 0) continue;
    const label = pariLabel(raw);
    const key = label.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ code: raw, label, count });
  }
  return out;
}

export function isNonPartant(p: Participant | null | undefined): boolean {
  const s = String(p?.statut ?? "").toUpperCase();
  return s.indexOf("NON_PARTANT") >= 0 || s === "NP" || s.indexOf("NON PARTANT") >= 0 || s === "RETIRE" || s === "RETRAIT";
}

export function driverOf(p: Participant | null | undefined): string {
  return String(p?.driver || p?.jockey || "").trim() || "—";
}

export function formatCote(value: number | string | undefined | null): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  } catch {
    return n.toFixed(1);
  }
}

export function sexeLabel(sexe: string | undefined | null): string {
  const s = String(sexe ?? "").toUpperCase();
  if (s === "H" || s === "HONGRE") return "Hongre";
  if (s === "M" || s === "MALE") return "Mâle";
  if (s === "F" || s === "FEMELLE") return "Femelle";
  return String(sexe ?? "");
}

export function isCourseFinished(course: Course | null | undefined): boolean {
  if (!course) return false;
  if (course.arriveeDefinitive === true || course.isArriveeDefinitive === true) return true;
  const s = String(course.statut ?? "").toUpperCase();
  if (s.indexOf("ARRIVEE") >= 0 || s.indexOf("FIN") >= 0 || s.indexOf("TERMIN") >= 0 || s.indexOf("OFFICIEL") >= 0) return true;
  return Array.isArray(course.ordreArrivee) && course.ordreArrivee.length > 0;
}

export function finishOrder(participants: Participant[] | null | undefined): ArriveeEntry[] {
  if (!Array.isArray(participants)) return [];
  return participants
    .map((p) => ({
      place: Number(p?.ordreArrivee ?? p?.positionArrivee),
      numPmu: Number(p?.numPmu) || 0,
      nom: String(p?.nom || ""),
      statut: String(p?.statut || p?.incident || ""),
      ecart: "",
      rapport: p?.dernierRapportDirect?.rapport ?? p?.rapportDirect,
    }))
    .filter((row) => Number.isFinite(row.place) && row.place > 0)
    .sort((a, b) => a.place - b.place || a.numPmu - b.numPmu);
}

export function arrivalFromCourse(course: Course | null | undefined, participants: Participant[] | null | undefined): ArriveeEntry[] {
  const fromParts = finishOrder(participants);
  if (fromParts.length > 0) return fromParts;
  const raw = course?.ordreArrivee;
  if (!Array.isArray(raw)) return [];
  const byNum = new Map<number, Participant>();
  if (Array.isArray(participants)) {
    for (const p of participants) {
      const num = Number(p?.numPmu);
      if (Number.isFinite(num)) byNum.set(num, p);
    }
  }
  return raw
    .map((item, index) => {
      if (typeof item === "number" || typeof item === "string") {
        const num = Number(item) || 0;
        return {
          place: index + 1,
          numPmu: num,
          nom: String(byNum.get(num)?.nom || ""),
          statut: "",
          ecart: "",
          rapport: byNum.get(num)?.dernierRapportDirect?.rapport,
        };
      }
      const row = (item || {}) as ArriveeOfficielle;
      const num = Number(row?.numPmu ?? row?.numero) || 0;
      return {
        place: Number(row?.position) || index + 1,
        numPmu: num,
        nom: String(row?.nom || byNum.get(num)?.nom || ""),
        statut: String(row?.statut || ""),
        ecart: String(row?.ecart || row?.temps || ""),
        rapport: row?.rapportDirect ?? row?.rapport,
      };
    })
    .filter((row) => row.place > 0 && (row.numPmu > 0 || row.nom))
    .sort((a, b) => a.place - b.place);
}

function extractReunions(payload: ProgrammeResponse | Reunion[] | null | undefined): Reunion[] {
  if (Array.isArray(payload)) return payload;
  const list = payload?.programme?.reunions || payload?.reunions || [];
  return Array.isArray(list) ? list : [];
}

export function cleanPath(path: string | null | undefined): string {
  const clean = String(path ?? "")
    .replace(/^\/+/, "")
    .split("?")[0]
    .split("#")[0]
    .trim();
  return /^\d{8}(?:\/R\d+\/C\d+\/[a-z0-9-]+)?$/i.test(clean) ? clean : "";
}

/** URL absolue uniquement. Jamais de chemin relatif : new URL planterait dans l'aperçu. */
export function absolutePmuUrl(path: string | null | undefined, base: string): string {
  const clean = cleanPath(path);
  const root = String(base ?? "");
  if (!clean || root.indexOf("https://") !== 0) return "";
  try {
    const url = new URL(clean, root);
    if (url.protocol !== "https:") return "";
    if (!url.hostname || url.hostname.indexOf(".") < 0) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function sliceJson(text: string): string {
  const raw = String(text ?? "").replace(/^\uFEFF/, "").trim();
  const obj = raw.indexOf("{");
  const arr = raw.indexOf("[");
  const starts = [obj, arr].filter((n) => n >= 0);
  if (!starts.length) return "";
  const start = Math.min.apply(null, starts);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return end > start ? raw.slice(start, end + 1) : "";
}

function useful(data: unknown): boolean {
  if (Array.isArray(data)) return data.length > 0;
  if (!data || typeof data !== "object") return false;
  const row = data as {
    programme?: { reunions?: unknown[] };
    reunions?: unknown[];
    participants?: unknown[];
    selection?: unknown[];
    commentaire?: unknown;
    error?: string;
  };
  if (row.error && !row.programme && !row.reunions && !row.participants && !row.selection && !row.commentaire) return false;
  if (Array.isArray(row.programme?.reunions) && row.programme.reunions.length > 0) return true;
  if (Array.isArray(row.reunions) && row.reunions.length > 0) return true;
  if (Array.isArray(row.participants)) return true;
  if (Array.isArray(row.selection)) return true;
  if (row.commentaire) return true;
  return false;
}

function parseLoose<T>(text: string): T | null {
  const sliced = sliceJson(text);
  if (!sliced) return null;
  try {
    const data = JSON.parse(sliced) as T;
    return useful(data) ? data : null;
  } catch {
    return null;
  }
}

function novaFetch(): ((input: string, init?: RequestInit) => Promise<Response>) | null {
  try {
    const nova = typeof window !== "undefined" ? window.nova : undefined;
    if (!nova || typeof nova.fetch !== "function") return null;
    const fn = nova.fetch;
    return (input, init) => {
      const target = String(input ?? "");
      if (target.indexOf("https://") !== 0) {
        return Promise.reject(new Error("Adresse PMU invalide."));
      }
      try {
        const checked = new URL(target);
        if (checked.protocol !== "https:") return Promise.reject(new Error("Adresse PMU invalide."));
      } catch {
        return Promise.reject(new Error("Adresse PMU invalide."));
      }
      return fn.call(nova, target, init);
    };
  } catch {
    return null;
  }
}

async function textOf(res: Response | null | undefined): Promise<string> {
  if (!res) return "";
  try {
    if (typeof res.text === "function") return await res.text();
    return JSON.stringify(res);
  } catch {
    return "";
  }
}

async function viaNova<T>(url: string): Promise<T | null> {
  const caller = novaFetch();
  if (!caller || !url) return null;
  const res = await caller(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res) return null;
  if (typeof res.ok === "boolean" && !res.ok) return null;
  return parseLoose<T>(await textOf(res));
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Le programme PMU ne répond pas. Touchez Réessayer.")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function requestJson<T>(path: string): Promise<T> {
  const clean = cleanPath(path);
  if (!clean) throw new Error("Adresse PMU invalide.");
  if (!novaFetch()) {
    throw new Error("Ouvrez Partants PMU dans l'atelier NOVA : le programme n'est pas joignable depuis un lien externe.");
  }
  const urls = [absolutePmuUrl(clean, OFFLINE), absolutePmuUrl(clean, ONLINE)].filter(
    (url, index, list) => Boolean(url) && list.indexOf(url) === index
  );
  if (!urls.length) throw new Error("Adresse PMU invalide.");
  let last = "Le programme PMU est momentanément indisponible. Touchez Réessayer.";
  for (const url of urls) {
    try {
      const data = await withTimeout(viaNova<T>(url), 12000);
      if (data) return data;
    } catch (err) {
      const raw = err instanceof Error ? String(err.message ?? "") : "";
      if (raw && raw.indexOf("invalide") < 0) last = raw;
    }
  }
  throw new Error(last);
}

function coursePath(date: Date, reunion: number, course: number, leaf: string): string {
  const r = Math.trunc(Number(reunion));
  const c = Math.trunc(Number(course));
  const safeLeaf = String(leaf ?? "").replace(/[^a-z0-9-]/gi, "");
  if (r <= 0 || c <= 0 || !safeLeaf) return "";
  return formatDateJJMMAAAA(date) + "/R" + String(r) + "/C" + String(c) + "/" + safeLeaf;
}

export async function fetchProgramme(date: Date): Promise<Reunion[]> {
  const data = await requestJson<ProgrammeResponse>(formatDateJJMMAAAA(date));
  return extractReunions(data)
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => (Number(a?.numOfficiel) || 0) - (Number(b?.numOfficiel) || 0))
    .map((item) => ({
      ...item,
      courses: Array.isArray(item.courses)
        ? [...item.courses].sort((a, b) => (Number(a?.numOrdre) || 0) - (Number(b?.numOrdre) || 0))
        : [],
    }));
}

export async function fetchParticipants(date: Date, reunion: number, course: number): Promise<Participant[]> {
  const path = coursePath(date, reunion, course, "participants");
  if (!path) return [];
  const data = await requestJson<ParticipantsResponse | Participant[]>(path);
  const list = Array.isArray(data) ? data : data?.participants || [];
  return Array.isArray(list) ? list : [];
}

export async function fetchPronostics(date: Date, reunion: number, course: number): Promise<SelectionItem[]> {
  const path = coursePath(date, reunion, course, "pronostics");
  if (!path) return [];
  const data = await requestJson<PronosticsResponse | SelectionItem[]>(path);
  const list = Array.isArray(data) ? data : data?.selection || [];
  return Array.isArray(list) ? [...list].sort((a, b) => (Number(a?.rang) || 99) - (Number(b?.rang) || 99)) : [];
}

export async function fetchCommentaire(date: Date, reunion: number, course: number): Promise<string> {
  const path = coursePath(date, reunion, course, "pronostics-detailles");
  if (!path) return "";
  const data = await requestJson<PronosticsDetaillesResponse>(path);
  if (!data) return "";
  if (typeof data.commentaire === "string") return String(data.commentaire);
  return String(data.commentaire?.texte || "");
}

export function courseCount(reunions: Reunion[] | null | undefined): number {
  if (!Array.isArray(reunions)) return 0;
  return reunions.reduce((n, r) => n + (Array.isArray(r?.courses) ? r.courses.length : 0), 0);
}

export function disciplineLabel(course: Course | null | undefined): string {
  const d = String(course?.discipline ?? "").toUpperCase();
  if (d.indexOf("ATTELE") >= 0) return "Attelé";
  if (d.indexOf("MONTE") >= 0) return "Monté";
  if (d.indexOf("PLAT") >= 0) return "Plat";
  if (d.indexOf("OBSTACLE") >= 0 || d.indexOf("HAIES") >= 0 || d.indexOf("STEEPLE") >= 0) return "Obstacle";
  if (d.indexOf("CROSS") >= 0) return "Cross";
  return String(course?.discipline || "Course");
}
