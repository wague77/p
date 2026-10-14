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

const BASES = [
  "https://online.turfinfo.api.pmu.fr/rest/client/7/programme/",
  "https://online.turfinfo.api.pmu.fr/rest/client/61/programme/",
  "https://online.turfinfo.api.pmu.fr/rest/client/1/programme/",
];

const BUDGET_MS = 8000;
const TRY_MS = 5500;

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
  if (key.indexOf("SIMPLE_GAGNANT") >= 0 || key.indexOf("SIMPLE_PLACE") >= 0) return 1;
  if (key.indexOf("COUPLE") >= 0 || key.indexOf("COUPL") >= 0 || key.indexOf("DEUX_SUR_QUATRE") >= 0 || key.indexOf("2SUR4") >= 0) {
    return 2;
  }
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

function extractReunions(payload: ProgrammeResponse | Reunion[] | null | undefined): Reunion[] {
  if (Array.isArray(payload)) return payload;
  const list = payload?.programme?.reunions || payload?.reunions || [];
  return Array.isArray(list) ? list : [];
}

export function buildPmuUrl(path: string): string {
  const clean = cleanProgrammePath(path);
  return clean ? BASES[0] + clean : "";
}

function cleanProgrammePath(path: string): string {
  const clean = String(path ?? "")
    .replace(/^\/+/, "")
    .split("?")[0]
    .split("#")[0]
    .trim();
  if (!/^\d{8}(?:\/R\d+\/C\d+\/[a-z0-9-]+)?$/i.test(clean)) return "";
  return clean;
}

function isHttp(value: string): boolean {
  const text = String(value ?? "");
  return text.indexOf("https://") === 0 || text.indexOf("http://") === 0;
}

function novaCaller(): ((input: string, init?: RequestInit) => Promise<Response>) | null {
  try {
    const nova = typeof window !== "undefined" ? window.nova : undefined;
    const fn = nova && nova.fetch;
    if (typeof fn !== "function") return null;
    return (input, init) => fn.call(nova, input, init);
  } catch {
    return null;
  }
}

function directCaller(): ((input: string, init?: RequestInit) => Promise<Response>) | null {
  try {
    if (typeof fetch !== "function") return null;
    return (input, init) => fetch(input, init);
  } catch {
    return null;
  }
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("délai")), ms);
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

function readableError(err: unknown): string {
  const message = err instanceof Error ? String(err.message ?? "") : String(err ?? "");
  const low = message.toLowerCase();
  if (low === "délai" || low.indexOf("abort") >= 0) return "Le programme PMU ne répond pas. Touchez Actualiser.";
  if (low.indexOf("invalid url") >= 0 || low.indexOf("failed to construct") >= 0) {
    return "Adresse PMU invalide. Touchez Actualiser.";
  }
  if (message.indexOf("403") >= 0) return "Le service PMU a répondu 403.";
  if (low.indexOf("failed to fetch") >= 0 || low.indexOf("network") >= 0 || low.indexOf("cors") >= 0) {
    return "Connexion au programme PMU impossible.";
  }
  return message || "Les données PMU ne se chargent pas.";
}

function parsePayload<T>(text: string): T {
  const trimmed = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (!trimmed) throw new Error("Réponse vide du service PMU.");
  const start = trimmed.charAt(0);
  if (start !== "{" && start !== "[") throw new Error("Réponse PMU illisible.");
  const data = JSON.parse(trimmed) as T & {
    contents?: unknown;
    error?: string;
    status?: { http_code?: number };
    programme?: unknown;
    reunions?: unknown;
    participants?: unknown;
    selection?: unknown;
    commentaire?: unknown;
  };
  if (data && typeof data.contents === "string") return parsePayload<T>(data.contents);
  if (data && typeof data.contents === "object" && data.contents) return data.contents as T;
  const code = Number(data?.status?.http_code);
  if (code >= 400 && !data?.programme && !data?.reunions && !data?.participants && !data?.selection) {
    throw new Error("Le service PMU a répondu " + String(code) + ".");
  }
  if (data && typeof data.error === "string" && data.error && !data.programme && !data.reunions && !data.participants && !data.selection && !data.commentaire) {
    throw new Error(String(data.error));
  }
  return data as T;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res || typeof res.text !== "function") {
    return parsePayload<T>(JSON.stringify(res ?? {}));
  }
  const text = await withTimeout(res.text().catch(() => ""), 4000);
  if (!res.ok) {
    const status = typeof res.status === "number" ? String(res.status) : "erreur";
    throw new Error("Le service PMU a répondu " + status + ".");
  }
  return parsePayload<T>(text);
}

async function loadUrl<T>(
  caller: (input: string, init?: RequestInit) => Promise<Response>,
  url: string
): Promise<T> {
  const target = String(url ?? "");
  if (!isHttp(target) && target.charAt(0) !== "/") throw new Error("Adresse PMU invalide.");
  const res = await caller(target, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return readJson<T>(res);
}

function proxyUrls(absolute: string): string[] {
  const target = encodeURIComponent(String(absolute ?? ""));
  return [
    "https://api.allorigins.win/get?url=" + target,
    "https://corsproxy.io/?" + target,
  ];
}

function jobsFor<T>(path: string): Array<() => Promise<T>> {
  const clean = cleanProgrammePath(path);
  const jobs: Array<() => Promise<T>> = [];
  if (!clean) return jobs;
  const direct = directCaller();
  const nova = novaCaller();
  const absolute = BASES.map((base) => base + clean);
  const push = (caller: (input: string, init?: RequestInit) => Promise<Response>, url: string) => {
    jobs.push(() => loadUrl<T>(caller, url));
  };
  if (direct) {
    absolute.forEach((url) => push(direct, url));
    push(direct, "/api/pmu?path=" + encodeURIComponent(clean));
    proxyUrls(absolute[0]).forEach((url) => push(direct, url));
  }
  if (nova) {
    absolute.forEach((url) => push(nova, url));
    proxyUrls(absolute[0]).forEach((url) => push(nova, url));
  }
  return jobs;
}

function firstOk<T>(jobs: Array<() => Promise<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      reject(new Error("Connexion indisponible. Rechargez la page."));
      return;
    }
    let left = jobs.length;
    let done = false;
    const fails: string[] = [];
    const stop = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("Le programme PMU ne répond pas. Touchez Actualiser."));
    }, BUDGET_MS);
    jobs.forEach((job) => {
      withTimeout(Promise.resolve().then(() => job()), TRY_MS)
        .then((data) => {
          if (done) return;
          done = true;
          clearTimeout(stop);
          resolve(data);
        })
        .catch((err) => {
          fails.push(readableError(err));
          left -= 1;
          if (left <= 0 && !done) {
            done = true;
            clearTimeout(stop);
            const last = fails.filter(Boolean).pop() || "Les données PMU ne se chargent pas. Touchez Actualiser.";
            reject(new Error(last));
          }
        });
    });
  });
}

async function requestJson<T>(path: string): Promise<T> {
  const clean = cleanProgrammePath(path);
  if (!clean) throw new Error("Adresse PMU invalide. Actualisez le programme.");
  return firstOk<T>(jobsFor<T>(clean));
}

function coursePath(date: Date, reunion: number, course: number, leaf: string): string {
  const stamp = formatDateJJMMAAAA(date);
  const r = Math.trunc(Number(reunion));
  const c = Math.trunc(Number(course));
  const safeLeaf = String(leaf ?? "").replace(/[^a-z0-9-]/gi, "");
  if (!Number.isFinite(r) || !Number.isFinite(c) || r <= 0 || c <= 0 || !safeLeaf) return "";
  return stamp + "/R" + String(r) + "/C" + String(c) + "/" + safeLeaf;
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
