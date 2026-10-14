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
    __pmuCb?: (data: unknown) => void;
  }
}

const CACHE_KEY = "partants-pmu-cache-v2";

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

function officialUrls(path: string): string[] {
  const clean = cleanPath(path);
  if (!clean) return [];
  const stamp = clean.split("/")[0];
  const rest = clean.indexOf("/") >= 0 ? clean.slice(stamp.length) : "";
  const bases = [
    "https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/",
    "https://online.turfinfo.api.pmu.fr/rest/client/7/programme/",
    "https://online.turfinfo.api.pmu.fr/rest/client/61/programme/",
    "https://online.turfinfo.api.pmu.fr/rest/client/1/programme/",
  ];
  const urls = bases.map((base) => base + clean);
  if (!rest) {
    urls.push("https://online.turfinfo.api.pmu.fr/rest/client/1/programme/" + stamp + "?specialisation=INTERNET");
  }
  return urls.filter((url, index) => urls.indexOf(url) === index);
}

function safeHttps(raw: string): string {
  const value = String(raw ?? "").trim();
  if (value.indexOf("https://") !== 0) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.hostname.indexOf(".") < 0) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function sliceJson(text: string): string {
  const raw = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (!raw) return "";
  if (raw.charAt(0) === "{" || raw.charAt(0) === "[") return raw;
  const obj = raw.indexOf("{");
  const arr = raw.indexOf("[");
  const starts = [obj, arr].filter((n) => n >= 0);
  if (!starts.length) return "";
  const start = Math.min.apply(null, starts);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return end > start ? raw.slice(start, end + 1) : "";
}

function asRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function payloadScore(data: unknown): number {
  if (Array.isArray(data)) return data.length > 0 ? 3 : 1;
  const row = asRecord(data);
  if (!row) return 0;
  if (row.error && !row.programme && !row.reunions && !row.participants && !row.selection && !row.commentaire) return 0;
  const reunions = extractReunions(row as ProgrammeResponse);
  if (reunions.length > 0) return 3;
  if (Array.isArray(row.participants) && row.participants.length > 0) return 3;
  if (Array.isArray(row.selection) && row.selection.length > 0) return 3;
  if (row.commentaire) return 3;
  if (row.programme || row.reunions || row.participants || row.selection) return 1;
  return 0;
}

function unwrap(data: unknown): unknown {
  const row = asRecord(data);
  if (!row) return data;
  if (typeof row.contents === "string") {
    const inner = parseLoose(String(row.contents));
    if (inner) return inner;
  }
  if (row.contents && typeof row.contents === "object") return unwrap(row.contents);
  if (row.data && typeof row.data === "object" && payloadScore(row) < payloadScore(row.data)) return unwrap(row.data);
  return data;
}

function parseLoose<T>(text: string): T | null {
  const sliced = sliceJson(text);
  if (!sliced) return null;
  try {
    const data = unwrap(JSON.parse(sliced));
    return payloadScore(data) > 0 ? (data as T) : null;
  } catch {
    return null;
  }
}

function waitForNova(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (typeof window.nova?.fetch === "function") return Promise.resolve();
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (typeof window.nova?.fetch === "function" || Date.now() - started > 1200) {
        clearInterval(timer);
        resolve();
      }
    }, 80);
  });
}

type Caller = (input: string, init?: RequestInit) => Promise<Response>;

function callers(): Caller[] {
  const list: Caller[] = [];
  try {
    const nova = typeof window !== "undefined" ? window.nova : undefined;
    if (nova && typeof nova.fetch === "function") {
      const fn = nova.fetch;
      list.push((input, init) => fn.call(nova, input, init));
    }
  } catch {
    /* connecteur absent */
  }
  try {
    if (typeof fetch === "function") list.push((input, init) => fetch(input, init));
  } catch {
    /* fetch absent */
  }
  return list;
}

async function readBody(res: unknown): Promise<string> {
  if (!res || typeof res !== "object") return "";
  const row = res as Response & { contents?: unknown; data?: unknown };
  try {
    if (typeof row.text === "function") {
      const text = await row.text();
      if (text) return String(text);
    }
  } catch {
    /* corps déjà lu */
  }
  try {
    if (typeof row.json === "function") {
      const data = await row.json();
      return JSON.stringify(data);
    }
  } catch {
    /* pas du JSON Response */
  }
  if (payloadScore(res) > 0 || asRecord(res)?.contents) return JSON.stringify(res);
  return "";
}

async function readUrl<T>(caller: Caller, url: string): Promise<T | null> {
  const target = safeHttps(url);
  if (!target) return null;
  try {
    const res = await caller(target, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res) return null;
    const status = Number((res as Response).status || 0);
    if (status >= 400) return null;
    const parsed = parseLoose<T>(await readBody(res));
    return parsed && payloadScore(parsed) >= 3 ? parsed : parsed && payloadScore(parsed) > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function withTimeout<T>(work: Promise<T | null>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}

function firstStrong<T>(jobs: Array<() => Promise<T | null>>, budget: number): Promise<T | null> {
  return new Promise((resolve) => {
    if (!jobs.length) {
      resolve(null);
      return;
    }
    let left = jobs.length;
    let done = false;
    let weak: T | null = null;
    const finish = (value: T | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(weak), budget);
    jobs.forEach((job) => {
      withTimeout(Promise.resolve().then(job), budget)
        .then((data) => {
          if (data && payloadScore(data) >= 3) {
            finish(data);
            return;
          }
          if (data && !weak) weak = data;
          left -= 1;
          if (left <= 0) finish(weak);
        })
        .catch(() => {
          left -= 1;
          if (left <= 0) finish(weak);
        });
    });
  });
}

function proxyUrls(target: string): string[] {
  const safe = safeHttps(target);
  if (!safe) return [];
  const encoded = encodeURIComponent(safe);
  return [
    safeHttps("https://api.allorigins.win/raw?url=" + encoded),
    safeHttps("https://api.allorigins.win/get?url=" + encoded),
    safeHttps("https://corsproxy.io/?" + encoded),
    safeHttps("https://api.codetabs.com/v1/proxy?quest=" + encoded),
  ].filter(Boolean);
}

function viaJsonp<T>(target: string): Promise<T | null> {
  const safe = safeHttps(target);
  if (!safe || typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const callback = "pmuCb" + String(Date.now()) + String(Math.floor(Math.random() * 1000));
    const script = document.createElement("script");
    let settled = false;
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        delete (window as unknown as Record<string, unknown>)[callback];
      } catch {
        /* callback déjà retiré */
      }
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 7000);
    (window as unknown as Record<string, unknown>)[callback] = (payload: unknown) => {
      const data = unwrap(payload);
      const parsed = payloadScore(data) > 0 ? (data as T) : parseLoose<T>(typeof payload === "string" ? payload : JSON.stringify(payload ?? ""));
      finish(parsed);
    };
    script.onerror = () => finish(null);
    const src = safeHttps("https://api.allorigins.win/get?url=" + encodeURIComponent(safe) + "&callback=" + callback);
    if (!src) {
      finish(null);
      return;
    }
    script.src = src;
    document.head.appendChild(script);
  });
}

async function readRelativeApi<T>(path: string): Promise<T | null> {
  if (typeof fetch !== "function") return null;
  const clean = cleanPath(path);
  if (!clean) return null;
  try {
    const res = await fetch("/api/pmu?path=" + encodeURIComponent(clean), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res || !res.ok) return null;
    const parsed = parseLoose<T>(await res.text());
    return parsed && payloadScore(parsed) > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function remember(path: string, data: unknown): void {
  if (payloadScore(data) < 3) return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const bag = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next = bag && typeof bag === "object" ? bag : {};
    next[path] = data;
    const keys = Object.keys(next);
    if (keys.length > 40) delete next[keys[0]];
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* cache optionnel */
  }
}

function recall<T>(path: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const bag = JSON.parse(raw) as Record<string, T>;
    const data = bag?.[path];
    return data && payloadScore(data) > 0 ? data : null;
  } catch {
    return null;
  }
}

async function requestJson<T>(path: string): Promise<T> {
  const clean = cleanPath(path);
  if (!clean) throw new Error("Adresse PMU invalide.");
  await waitForNova();
  const urls = officialUrls(clean);
  const active = callers();
  const direct = urls.flatMap((url) => active.map((caller) => () => readUrl<T>(caller, url)));
  const found = await firstStrong<T>(direct, 8000);
  if (found && payloadScore(found) >= 3) {
    remember(clean, found);
    return found;
  }
  const primary = urls[0] || "";
  const proxies = proxyUrls(primary).flatMap((url) => active.map((caller) => () => readUrl<T>(caller, url)));
  const extra: Array<() => Promise<T | null>> = [
    ...proxies,
    () => viaJsonp<T>(primary),
    () => readRelativeApi<T>(clean),
  ];
  const second = await firstStrong<T>(extra, 8000);
  const best = (second && payloadScore(second) >= payloadScore(found) ? second : found) || second;
  if (best && payloadScore(best) > 0) {
    if (payloadScore(best) >= 3) remember(clean, best);
    return best;
  }
  const cached = recall<T>(clean);
  if (cached) return cached;
  throw new Error("Le programme PMU ne répond pas. Touchez Réessayer.");
}

function coursePath(date: Date, reunion: number, course: number, leaf: string): string {
  const r = Math.trunc(Number(reunion));
  const c = Math.trunc(Number(course));
  const safeLeaf = String(leaf ?? "").replace(/[^a-z0-9-]/gi, "");
  if (r <= 0 || c <= 0 || !safeLeaf) return "";
  return formatDateJJMMAAAA(date) + "/R" + String(r) + "/C" + String(c) + "/" + safeLeaf;
}

function normalizeReunions(data: ProgrammeResponse | Reunion[] | null | undefined): Reunion[] {
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

export async function fetchProgramme(date: Date): Promise<Reunion[]> {
  const data = await requestJson<ProgrammeResponse>(formatDateJJMMAAAA(date));
  return normalizeReunions(data);
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
