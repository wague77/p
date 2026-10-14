import {
  arrivalFromCourse,
  fetchParticipants,
  fetchProgramme,
  fetchPronostics,
  formatCote,
  formatDateJJMMAAAA,
  formatHeure,
  hippodromeLabel,
  horsesForPari,
  isNonPartant,
  toInputDate,
  uniqueParis,
} from "./pmu";
import type { ArriveeEntry, Course, Participant, Reunion, SelectionItem } from "./types";

export type HistoryRange = "1m" | "3m" | "1y";

export const PRONO_TOP = 8;

export interface HistoryRace {
  date: string;
  reunion: number;
  course: number;
  hippodrome: string;
  libelle: string;
  heure: string;
  pronostic: string;
  arrivee: string;
  topHits: number;
  winnerWasPick: boolean;
  picks: HistoryHorse[];
  finish: ArriveeEntry[];
}

export interface HistoryHorse {
  num: number;
  nom: string;
  cote: number;
  rang: number;
  place: number;
  role: "favori" | "outsider" | "tocard" | "base";
}

export interface RoleAdvice {
  role: "favori" | "outsider" | "tocard";
  title: string;
  hint: string;
  horses: HistoryHorse[];
}

export interface HistoryReport {
  races: HistoryRace[];
  scanned: number;
  quinteDays: number;
  topRate: number;
  winnerRate: number;
  favoriteWinRate: number;
  outsiderTopRate: number;
  tocardTopRate: number;
  advice: RoleAdvice[];
  next: {
    reunion: number;
    course: number;
    hippodrome: string;
    libelle: string;
    heure: string;
    date: string;
  } | null;
}

const RANGE_DAYS: Record<HistoryRange, number> = { "1m": 31, "3m": 92, "1y": 366 };

export function rangeLabel(range: HistoryRange): string {
  if (range === "1m") return "1 mois";
  if (range === "3m") return "3 mois";
  return "1 an";
}

export function shiftDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function isQuinteCourse(course: Course | null | undefined): boolean {
  const jeux = uniqueParis(course?.paris);
  if (jeux.some((jeu) => jeu.count >= 5 || jeu.label.toUpperCase().indexOf("QUINT") >= 0)) return true;
  const raw = Array.isArray(course?.paris) ? course.paris : [];
  return raw.some((pari) => {
    const code = String(pari?.codePari ?? "");
    return horsesForPari(code) >= 5 || code.toUpperCase().indexOf("QUINT") >= 0 || code.toUpperCase().indexOf("PICK5") >= 0;
  });
}

export function findQuinte(reunions: Reunion[] | null | undefined): {
  reunion: Reunion;
  course: Course;
} | null {
  const list = Array.isArray(reunions) ? reunions : [];
  for (const reunion of list) {
    const courses = Array.isArray(reunion?.courses) ? reunion.courses : [];
    const course = courses.find((item) => isQuinteCourse(item));
    if (course && Number(reunion?.numOfficiel) > 0 && Number(course?.numOrdre) > 0) {
      return { reunion, course };
    }
  }
  return null;
}

function pickNum(item: SelectionItem | null | undefined): number {
  return Number(item?.num_partant ?? item?.numPartant) || 0;
}

function roleOf(cote: number, rang: number): HistoryHorse["role"] {
  if ((cote > 0 && cote <= 6) || rang <= 2) return "favori";
  if ((cote > 6 && cote <= 18) || (rang >= 3 && rang <= 6)) return "outsider";
  if (cote > 18 || rang >= 7) return "tocard";
  return "base";
}

function buildPicks(selection: SelectionItem[], participants: Participant[], finish: ArriveeEntry[]): HistoryHorse[] {
  const byNum = new Map<number, Participant>();
  const safeParts = Array.isArray(participants) ? participants : [];
  for (const p of safeParts) {
    const num = Number(p?.numPmu);
    if (Number.isFinite(num)) byNum.set(num, p);
  }
  const placeOf = new Map<number, number>();
  const safeFinish = Array.isArray(finish) ? finish : [];
  for (const row of safeFinish) placeOf.set(Number(row?.numPmu) || 0, Number(row?.place) || 0);
  const safeSelection = Array.isArray(selection) ? selection : [];
  return safeSelection
    .map((item, index) => {
      const num = pickNum(item);
      const horse = byNum.get(num);
      const cote = Number(item?.cote_prob ?? item?.coteProb ?? horse?.dernierRapportDirect?.rapport) || 0;
      const rang = Number(item?.rang) || index + 1;
      return {
        num,
        nom: String(horse?.nom || item?.nom || (num ? `N°${num}` : "Cheval")),
        cote,
        rang,
        place: placeOf.get(num) || 0,
        role: roleOf(cote, rang),
      };
    })
    .filter((row) => row.num > 0)
    .sort((a, b) => a.rang - b.rang);
}

export function topPronostic(picks: HistoryHorse[] | null | undefined): HistoryHorse[] {
  const list = Array.isArray(picks) ? picks : [];
  return list.slice(0, PRONO_TOP);
}

export function currentQuinteHorses(selection: SelectionItem[], participants: Participant[]): RoleAdvice[] {
  const finish: ArriveeEntry[] = [];
  const safeParts = Array.isArray(participants) ? participants : [];
  const picks = buildPicks(Array.isArray(selection) ? selection : [], safeParts, finish).filter((row) => {
    const horse = safeParts.find((p) => Number(p?.numPmu) === row.num);
    return horse ? !isNonPartant(horse) : true;
  });
  return groupAdvice(topPronostic(picks), null);
}

function groupAdvice(picks: HistoryHorse[], stats: HistoryReport | null): RoleAdvice[] {
  const list = Array.isArray(picks) ? picks : [];
  const favoris = list.filter((row) => row.role === "favori").slice(0, 3);
  const outsiders = list.filter((row) => row.role === "outsider").slice(0, 4);
  const tocards = list.filter((row) => row.role === "tocard").slice(0, 2);
  const fav = stats ? Math.round(stats.favoriteWinRate) : null;
  const out = stats ? Math.round(stats.outsiderTopRate) : null;
  const toc = stats ? Math.round(stats.tocardTopRate) : null;
  return [
    {
      role: "favori",
      title: "Favoris à jouer",
      hint:
        fav === null
          ? "Bases courtes du top 8, cote jusqu'à 6/1."
          : `Sur l'historique, le favori du pronostic gagne ${fav} % des Quintés analysés.`,
      horses: favoris,
    },
    {
      role: "outsider",
      title: "Outsiders à jouer",
      hint:
        out === null
          ? "Chevaux de cote moyenne, souvent 3e à 6e du top 8."
          : `Les outsiders du top 8 finissent dans les 5 dans ${out} % des cas suivis.`,
      horses: outsiders,
    },
    {
      role: "tocard",
      title: "Tocard à glisser",
      hint:
        toc === null
          ? "Longs coups du top 8 (7e et 8e, ou cote au-delà de 18/1), jamais comme base unique."
          : `Un tocard du top 8 entre dans les 5 dans ${toc} % des Quintés suivis. À glisser, pas à jouer seul.`,
      horses: tocards.slice(0, 1),
    },
  ];
}

async function loadQuinteDay(date: Date): Promise<HistoryRace | null> {
  const reunions = await fetchProgramme(date);
  const found = findQuinte(reunions);
  if (!found) return null;
  const rNum = Number(found.reunion.numOfficiel);
  const cNum = Number(found.course.numOrdre);
  const [participants, selection] = await Promise.all([
    fetchParticipants(date, rNum, cNum).catch(() => [] as Participant[]),
    fetchPronostics(date, rNum, cNum).catch(() => [] as SelectionItem[]),
  ]);
  const parts = Array.isArray(participants) ? participants : [];
  const picksRaw = Array.isArray(selection) ? selection : [];
  const finish = arrivalFromCourse(found.course, parts);
  const picks = buildPicks(picksRaw, parts, finish);
  const top = new Set(
    (Array.isArray(finish) ? finish : [])
      .filter((row) => Number(row?.place) > 0 && Number(row.place) <= 5)
      .map((row) => Number(row.numPmu) || 0)
  );
  const topPicks = topPronostic(picks);
  const topHits = topPicks.filter((row) => top.has(row.num)).length;
  const winner = (Array.isArray(finish) ? finish : []).find((row) => Number(row?.place) === 1);
  return {
    date: toInputDate(date),
    reunion: rNum,
    course: cNum,
    hippodrome: hippodromeLabel(found.reunion),
    libelle: String(found.course.libelle || `Course ${cNum}`),
    heure: formatHeure(found.course.heureDepart),
    pronostic: topPicks.map((row) => String(row.num)).join(" - ") || "—",
    arrivee:
      (Array.isArray(finish) ? finish : [])
        .slice(0, 5)
        .map((row) => String(row?.numPmu || "–"))
        .join(" - ") || "—",
    topHits,
    winnerWasPick: Boolean(winner && topPicks.some((row) => row.num === Number(winner.numPmu))),
    picks: topPicks,
    finish: Array.isArray(finish) ? finish : [],
  };
}

export async function loadHistory(
  range: HistoryRange,
  today: Date,
  onProgress?: (done: number, total: number) => void
): Promise<HistoryRace[]> {
  const days = RANGE_DAYS[range] || 31;
  const dates: Date[] = [];
  for (let i = 1; i <= days; i += 1) dates.push(shiftDays(today, -i));
  const races: HistoryRace[] = [];
  const batch = 4;
  for (let i = 0; i < dates.length; i += batch) {
    const slice = dates.slice(i, i + batch);
    const rows = await Promise.all(slice.map((date) => loadQuinteDay(date).catch(() => null)));
    for (const row of rows) {
      if (row && ((Array.isArray(row.finish) && row.finish.length > 0) || (Array.isArray(row.picks) && row.picks.length > 0))) {
        races.push(row);
      }
    }
    if (onProgress) onProgress(Math.min(dates.length, i + slice.length), dates.length);
  }
  return races.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function buildReport(
  races: HistoryRace[],
  scanned: number,
  next: HistoryReport["next"],
  current?: RoleAdvice[]
): HistoryReport {
  const safeRaces = Array.isArray(races) ? races : [];
  const withFinish = safeRaces.filter((race) => Array.isArray(race?.finish) && race.finish.length > 0);
  const withBoth = withFinish.filter((race) => Array.isArray(race?.picks) && race.picks.length > 0);
  const topRate = withBoth.length
    ? withBoth.reduce((sum, race) => sum + (Number(race.topHits) || 0), 0) / (withBoth.length * PRONO_TOP)
    : 0;
  const winnerRate = withBoth.length
    ? withBoth.filter((race) => race.winnerWasPick).length / withBoth.length
    : 0;
  let favWins = 0;
  let favRaces = 0;
  let outHits = 0;
  let outCount = 0;
  let tocHits = 0;
  let tocCount = 0;
  for (const race of withBoth) {
    const picks = Array.isArray(race.picks) ? race.picks : [];
    const fav = picks.find((row) => row.role === "favori") || picks[0];
    if (fav) {
      favRaces += 1;
      if (fav.place === 1) favWins += 1;
    }
    for (const row of picks) {
      if (row.role === "outsider") {
        outCount += 1;
        if (row.place > 0 && row.place <= 5) outHits += 1;
      }
      if (row.role === "tocard") {
        tocCount += 1;
        if (row.place > 0 && row.place <= 5) tocHits += 1;
      }
    }
  }
  const report: HistoryReport = {
    races: safeRaces,
    scanned: Number(scanned) || 0,
    quinteDays: safeRaces.length,
    topRate: topRate * 100,
    winnerRate: winnerRate * 100,
    favoriteWinRate: favRaces ? (favWins / favRaces) * 100 : 0,
    outsiderTopRate: outCount ? (outHits / outCount) * 100 : 0,
    tocardTopRate: tocCount ? (tocHits / tocCount) * 100 : 0,
    advice: [],
    next,
  };
  const advice = Array.isArray(current) ? current : [];
  report.advice = advice.some((item) => Array.isArray(item?.horses) && item.horses.length > 0)
    ? advice.map((item) => {
        if (item.role === "favori") {
          return {
            ...item,
            hint: `Sur ${rangeHint(report)}, le favori du top 8 gagne ${Math.round(report.favoriteWinRate)} % des Quintés.`,
          };
        }
        if (item.role === "outsider") {
          return {
            ...item,
            hint: `Les outsiders du top 8 finissent dans les 5 dans ${Math.round(report.outsiderTopRate)} % des cas.`,
          };
        }
        return {
          ...item,
          hint: `Un tocard du top 8 entre dans les 5 dans ${Math.round(report.tocardTopRate)} % des Quintés. À glisser seulement.`,
        };
      })
    : [];
  return report;
}

function rangeHint(report: HistoryReport): string {
  const n = Number(report?.quinteDays) || 0;
  return `${n} Quinté${n > 1 ? "s" : ""} analysé${n > 1 ? "s" : ""}`;
}

export function formatStampLabel(date: string): string {
  const parsed = String(date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return parsed || "Date";
  const [y, m, d] = parsed.split("-");
  return `${d}/${m}/${y}`;
}

export function coteText(value: number): string {
  return formatCote(value);
}

export function emptyNext(): HistoryReport["next"] {
  return null;
}

export function programmeStamp(date: Date): string {
  return formatDateJJMMAAAA(date);
}
