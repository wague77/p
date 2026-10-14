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

const PMU_ORIGIN = "https://offline.turfinfo.api.pmu.fr";
const PMU_PREFIX = "/rest/client/7/programme/";

function safeDate(input: Date | null | undefined): Date {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input;
  return new Date();
}

export function formatDateJJMMAAAA(date: Date | null | undefined): string {
  const d = safeDate(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}${mm}${yyyy}`;
}

export function parseInputDate(value: string | null | undefined): Date {
  const raw = String(value ?? "");
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  const y = Number(match[1]);
  const m = Number(match[2]);
  const day = Number(match[3]);
  if (!y || !m || !day) return new Date();
  const parsed = new Date(y, m - 1, day);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

export function toInputDate(date: Date | null | undefined): string {
  const d = safeDate(date);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }
  if (n >= 0 && n < 2400) {
    const h = Math.floor(n / 100);
    const m = Math.round(n % 100);
    if (h < 24 && m < 60) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return String(value);
}

export function hippodromeLabel(reunion: Reunion | null | undefined): string {
  const court = reunion?.hippodrome?.libelleCourt;
  const long = reunion?.hippodrome?.libelleLong;
  return String(court || long || "Hippodrome").toUpperCase();
}

export function paysLabel(reunion: Reunion | null | undefined): string {
  const pays = reunion?.pays;
  if (!pays) return "";
  if (typeof pays === "string") return String(pays);
  return String(pays.libelle || pays.code || "");
}

export function cleanPariCode(code: string | undefined | null): string {
  return String(code ?? "")
    .replace(/^E_/i, "")
    .replace(/_/g, " ")
    .trim();
}

export function pariLabel(code: string | undefined | null): string {
  const raw = String(code ?? "");
  const key = raw.toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    SIMPLE_GAGNANT: "Simple gagnant",
    SIMPLE_PLACE: "Simple placé",
    SIMPLE_GAGNANT_INTERNATIONAL: "Simple gagnant",
    SIMPLE_PLACE_INTERNATIONAL: "Simple placé",
    COUPLE_GAGNANT: "Couplé gagnant",
    COUPLE_PLACE: "Couplé placé",
    COUPLE_ORDRE: "Couplé ordre",
    DEUX_SUR_QUATRE: "2 sur 4",
    "2SUR4": "2 sur 4",
    TRIO: "Trio",
    TRIO_ORDRE: "Trio ordre",
    TIERCE: "Tiercé",
    SUPER_QUATRE: "Super 4",
    SUPER4: "Super 4",
    QUARTE_PLUS: "Quarté+",
    QUARTE: "Quarté+",
    MULTI: "Multi",
    MINI_MULTI: "Mini Multi",
    QUINTE_PLUS: "Quinté+",
    QUINTE: "Quinté+",
    PICK5: "Pick 5",
    PICK_5: "Pick 5",
    REPORT_PLUS: "Report+",
  };
  if (map[key]) return map[key];
  if (!raw) return "Jeu";
  return raw
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function horsesForPari(code: string | undefined | null): number {
  const key = String(code ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (!key) return 0;
  if (key.indexOf("SIMPLE_GAGNANT") >= 0 || key.indexOf("SIMPLE_PLACE") >= 0 || key === "SG" || key === "SP") {
    return 1;
  }
  if (
    key.indexOf("COUPLE") >= 0 ||
    key.indexOf("COUPL") >= 0 ||
    key.indexOf("DEUX_SUR_QUATRE") >= 0 ||
    key.indexOf("2SUR4") >= 0 ||
    key.indexOf("2_SUR_4") >= 0
  ) {
    return 2;
  }
  if (key.indexOf("TRIO") >= 0 || key.indexOf("TIERCE") >= 0 || key.indexOf("TIERC") >= 0) return 3;
  if (
    key.indexOf("SUPER_QUATRE") >= 0 ||
    key.indexOf("SUPER4") >= 0 ||
    key.indexOf("SUPER_4") >= 0 ||
    key.indexOf("QUARTE") >= 0 ||
    key.indexOf("MULTI") >= 0
  ) {
    return 4;
  }
  if (key.indexOf("QUINTE") >= 0 || key.indexOf("PICK5") >= 0 || key.indexOf("PICK_5") >= 0) return 5;
  return 0;
}

export function uniqueParis(paris: Pari[] | undefined | null): { code: string; label: string; count: number }[] {
  if (!Array.isArray(paris)) return [];
  const seen = new Set<string>();
  const out: { code: string; label: string; count: number }[] = [];
  for (const p of paris) {
    const raw = cleanPariCode(p?.codePari);
    if (!raw) continue;
    const count = horsesForPari(raw);
    if (count <= 0) continue;
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
  return (
    s.indexOf("NON_PARTANT") >= 0 ||
    s === "NP" ||
    s.indexOf("NON PARTANT") >= 0 ||
    s === "RETIRE" ||
    s === "RETRAIT" ||
    s.indexOf("ANNULE") >= 0
  );
}

export function driverOf(p: Participant | null | undefined): string {
  return String(p?.driver || p?.jockey || "").trim() || "—";
}

export function formatCote(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "—";
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

export function courseStatus(course: Course | null | undefined): string {
  return String(course?.statut ?? "").toUpperCase();
}

export function isCourseFinished(course: Course | null | undefined): boolean {
  if (!course) return false;
  if (course.arriveeDefinitive === true || course.isArriveeDefinitive === true) return true;
  const s = courseStatus(course);
  if (
    s.indexOf("ARRIVEE") >= 0 ||
    s.indexOf("FIN") >= 0 ||
    s.indexOf("TERMIN") >= 0 ||
    s.indexOf("OFFICIEL") >= 0 ||
    s === "FINISHED" ||
    s === "RESULTED"
  ) {
    return true;
  }
  const raw = course.ordreArrivee;
  if (Array.isArray(raw) && raw.length > 0) return true;
  return false;
}

export function finishOrder(participants: Participant[] | null | undefined): ArriveeEntry[] {
  if (!Array.isArray(participants)) return [];
  return participants
    .map((p) => {
      const place = Number(p?.ordreArrivee ?? p?.positionArrivee);
      return {
        place,
        numPmu: Number(p?.numPmu) || 0,
        nom: String(p?.nom || ""),
        statut: String(p?.statut || p?.incident || ""),
        ecart: "",
        rapport: p?.dernierRapportDirect?.rapport ?? p?.rapportDirect,
      };
    })
    .filter((row) => Number.isFinite(row.place) && row.place > 0)
    .sort((a, b) => a.place - b.place || a.numPmu - b.numPmu);
}

export function arrivalFromCourse(
  course: Course | null | undefined,
  participants: Participant[] | null | undefined
): ArriveeEntry[] {
  const fromParts = finishOrder(participants);
  if (fromParts.length > 0) return fromParts;
  const raw = course?.ordreArrivee;
  if (!Array.isArray(raw) || raw.length === 0) return [];
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
        const horse = byNum.get(num);
        return {
          place: index + 1,
          numPmu: num,
          nom: String(horse?.nom || ""),
          statut: "",
          ecart: "",
          rapport: horse?.dernierRapportDirect?.rapport,
        };
      }
      const row = (item || {}) as ArriveeOfficielle;
      const num = Number(row?.numPmu ?? row?.numero) || 0;
      const horse = byNum.get(num);
      return {
        place: Number(row?.position) || index + 1,
        numPmu: num,
        nom: String(row?.nom || horse?.nom || ""),
        statut: String(row?.statut || ""),
        ecart: String(row?.ecart || row?.temps || ""),
        rapport: row?.rapportDirect ?? row?.rapport ?? horse?.dernierRapportDirect?.rapport,
      };
    })
    .filter((row) => row.place > 0 && (row.numPmu > 0 || row.nom))
    .sort((a, b) => a.place - b.place);
}

export function arrivalPreview(entries: ArriveeEntry[] | null | undefined, max = 5): string {
  if (!Array.isArray(entries) || entries.length === 0) return "";
  return entries
    .slice(0, max)
    .map((row) => String(row?.numPmu || "–"))
    .join(" - ");
}

function extractReunions(payload: ProgrammeResponse | Reunion[] | null | undefined): Reunion[] {
  if (Array.isArray(payload)) return payload;
  const list = payload?.programme?.reunions || payload?.reunions || [];
  return Array.isArray(list) ? list : [];
}

export function buildPmuUrl(path: string): string {
  const clean = String(path ?? "")
    .replace(/^\/+/, "")
    .split("?")[0]
    .split("#")[0]
    .trim();
  if (!/^\d{8}(?:\/R\d+\/C\d+\/[a-z0-9-]+)?$/i.test(clean)) {
    return "";
  }
  return PMU_ORIGIN + PMU_PREFIX + clean;
}

function isAbsoluteHttp(value: string): boolean {
  const text = String(value ?? "");
  return text.indexOf("https://") === 0 || text.indexOf("http://") === 0;
}

function novaFetchFn(): ((input: string, init?: RequestInit) => Promise<Response>) | null {
  try {
    const nova = typeof window !== "undefined" ? window.nova : undefined;
    const fn = nova && nova.fetch;
    if (typeof fn !== "function") return null;
    return function novaBound(input: string, init?: RequestInit) {
      const target = String(input ?? "");
      if (!isAbsoluteHttp(target)) {
        return Promise.reject(new Error("Adresse PMU invalide."));
      }
      return fn.call(nova, target, init);
    };
  } catch {
    return null;
  }
}

function directFetch(): ((input: string, init?: RequestInit) => Promise<Response>) | null {
  try {
    if (typeof fetch !== "function") return null;
    return function direct(input: string, init?: RequestInit) {
      const target = String(input ?? "");
      if (!isAbsoluteHttp(target)) {
        return Promise.reject(new Error("Adresse PMU invalide."));
      }
      return fetch(target, init);
    };
  } catch {
    return null;
  }
}

function readableError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? String(err.message ?? "") : String(err ?? "");
  const low = message.toLowerCase();
  if (
    low.indexOf("invalid url") >= 0 ||
    low.indexOf("failed to construct") >= 0 ||
    low.indexOf("failed to parse url") >= 0
  ) {
    return "Le programme PMU n'a pas pu être contacté. Touchez Actualiser.";
  }
  if (
    low.indexOf("failed to fetch") >= 0 ||
    low.indexOf("network") >= 0 ||
    low.indexOf("load failed") >= 0 ||
    low.indexOf("cors") >= 0 ||
    low.indexOf("not allowed") >= 0
  ) {
    return "Le programme PMU n'est pas joignable depuis ce lien. Ouvrez l'application dans l'atelier NOVA, ou réessayez.";
  }
  return message || fallback;
}

async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function parsePayload<T>(text: string): T {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("Réponse vide du service PMU.");
  if (trimmed.charAt(0) !== "{" && trimmed.charAt(0) !== "[") {
    throw new Error("Réponse PMU illisible. Réessayez.");
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error("Réponse PMU illisible. Réessayez.");
  }
}

async function callJson<T>(
  requester: (input: string, init?: RequestInit) => Promise<Response>,
  href: string
): Promise<T> {
  const target = String(href ?? "");
  if (!isAbsoluteHttp(target) || target.indexOf(PMU_ORIGIN + PMU_PREFIX) !== 0) {
    throw new Error("Adresse PMU invalide. Actualisez le programme.");
  }
  const res = await requester(target, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const text = await readBody(res);
  if (!res || !res.ok) {
    const status = res && typeof res.status === "number" ? String(res.status) : "erreur";
    throw new Error("Le service PMU a répondu " + status + ".");
  }
  return parsePayload<T>(text);
}

async function requestJson<T>(path: string): Promise<T> {
  const href = buildPmuUrl(path);
  if (!href) {
    throw new Error("Adresse PMU invalide. Actualisez le programme.");
  }
  const callers: Array<(input: string, init?: RequestInit) => Promise<Response>> = [];
  const viaNova = novaFetchFn();
  const viaDirect = directFetch();
  if (viaNova) callers.push(viaNova);
  if (viaDirect) callers.push(viaDirect);
  if (callers.length === 0) {
    throw new Error("Connexion indisponible dans cet aperçu. Rechargez la page.");
  }
  let last = "Le programme PMU n'est pas joignable. Réessayez.";
  for (const caller of callers) {
    try {
      return await callJson<T>(caller, href);
    } catch (err) {
      last = readableError(err, last);
    }
  }
  throw new Error(last);
}

function coursePath(date: Date, reunion: number, course: number, leaf: string): string {
  const stamp = formatDateJJMMAAAA(date);
  const r = Math.trunc(Number(reunion));
  const c = Math.trunc(Number(course));
  const safeLeaf = String(leaf ?? "").replace(/[^a-z0-9-]/gi, "");
  if (!Number.isFinite(r) || !Number.isFinite(c) || r <= 0 || c <= 0 || !safeLeaf) {
    return "";
  }
  return stamp + "/R" + String(r) + "/C" + String(c) + "/" + safeLeaf;
}

export async function fetchProgramme(date: Date): Promise<Reunion[]> {
  const stamp = formatDateJJMMAAAA(date);
  const data = await requestJson<ProgrammeResponse>(stamp);
  const reunions = extractReunions(data)
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => (Number(a?.numOfficiel) || 0) - (Number(b?.numOfficiel) || 0));
  return reunions.map((item) => ({
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
  return Array.isArray(list)
    ? [...list].sort((a, b) => (Number(a?.rang) || 99) - (Number(b?.rang) || 99))
    : [];
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
  if (!d) return "Course";
  if (d.indexOf("ATTELE") >= 0) return "Attelé";
  if (d.indexOf("MONTE") >= 0) return "Monté";
  if (d.indexOf("PLAT") >= 0) return "Plat";
  if (d.indexOf("OBSTACLE") >= 0 || d.indexOf("HAIES") >= 0 || d.indexOf("STEEPLE") >= 0) return "Obstacle";
  if (d.indexOf("CROSS") >= 0) return "Cross";
  return String(course?.discipline || "Course");
}
