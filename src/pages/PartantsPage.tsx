import React, { useEffect, useMemo, useState } from "react";
import { Heart, Star, Trophy, History } from "lucide-react";
import HistoryAnalysisModal from "../components/HistoryAnalysisModal";
import { isRealQuinteCourse, saveRealQuinteRecord } from "../lib/quinteHistory";
import Header from "../components/Header";
import ResponsiblePlay from "../components/ResponsiblePlay";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/StatusMessage";
import { addFavorite, listFavorites, removeFavorite, type FavoriteCourse } from "../lib/db";
import {
  disciplineLabel,
  driverOf,
  fetchCommentaire,
  fetchParticipants,
  fetchPronostics,
  formatCote,
  formatHeure,
  hippodromeLabel,
  isNonPartant,
  parseInputDate,
  sexeLabel,
  uniqueParis,
} from "../lib/pmu";
import type { Course, Participant, Reunion, SelectionItem } from "../lib/types";

interface Props {
  reunions: Reunion[];
  loadingProgramme: boolean;
  programmeError: string;
  dateValue: string;
  onDateChange: (value: string) => void;
  onRefresh: () => void;
  selectedReunion: number | null;
  selectedCourse: number | null;
  onSelect: (reunion: number, course: number) => void;
}

export default function PartantsPage({
  reunions,
  loadingProgramme,
  programmeError,
  dateValue,
  onDateChange,
  onRefresh,
  selectedReunion,
  selectedCourse,
  onSelect,
}: Props) {
  const list = Array.isArray(reunions) ? reunions : [];
  const date = useMemo(() => parseInputDate(dateValue), [dateValue]);
  const reunion = list.find((r) => Number(r?.numOfficiel) === Number(selectedReunion)) || list[0];
  const courses = Array.isArray(reunion?.courses) ? reunion.courses : [];
  const course = courses.find((c) => Number(c?.numOrdre) === Number(selectedCourse)) || courses[0] || null;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selection, setSelection] = useState<SelectionItem[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favId, setFavId] = useState<string | null>(null);
  const [favBusy, setFavBusy] = useState(false);

  useEffect(() => {
    const rNum = Number(reunion?.numOfficiel);
    const cNum = Number(course?.numOrdre);
    if (!rNum || !cNum) return;
    if (rNum !== Number(selectedReunion) || cNum !== Number(selectedCourse)) {
      onSelect(rNum, cNum);
    }
  }, [reunion, course, selectedReunion, selectedCourse, onSelect]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rNum = Number(reunion?.numOfficiel);
      const cNum = Number(course?.numOrdre);
      if (!rNum || !cNum) {
        setParticipants([]);
        setSelection([]);
        setCommentaire("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [parts, sel, text] = await Promise.all([
          fetchParticipants(date, rNum, cNum),
          fetchPronostics(date, rNum, cNum).catch(() => [] as SelectionItem[]),
          fetchCommentaire(date, rNum, cNum).catch(() => ""),
        ]);
        if (cancelled) return;
        setParticipants(Array.isArray(parts) ? parts : []);
        setSelection(Array.isArray(sel) ? sel : []);
        setCommentaire(String(text ?? ""));

        const arrived = parts.filter((p) => typeof p?.ordreArrivee === "number" && p.ordreArrivee > 0);
        if (course && isRealQuinteCourse(course, reunion?.numOfficiel) && arrived.length >= 3) {
          arrived.sort((a, b) => (a.ordreArrivee || 99) - (b.ordreArrivee || 99));
          const arriveeNums = arrived.map((p) => Number(p.numPmu)).filter(Boolean);
          const pronoNums = sel.slice(0, 5).map((s) => Number(s.num_partant ?? s.numPartant)).filter(Boolean);
          const exactHits = arriveeNums.filter((h) => pronoNums.includes(h)).length;

          saveRealQuinteRecord({
            id: `quinte_${dateValue}_R${rNum}_C${cNum}`,
            date: dateValue,
            hippodrome: hippodromeLabel(reunion),
            discipline: disciplineLabel(course),
            prix: String(course.libelle || "Quinté+"),
            pronosticWague: pronoNums.length ? pronoNums : [1, 2, 3, 4, 5],
            arriveeOfficielle: arriveeNums,
            exactHits,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setParticipants([]);
        setSelection([]);
        setCommentaire("");
        setError(err instanceof Error ? String(err.message ?? "") : "Impossible de charger les partants de cette course.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dateValue, reunion, course, date]);

  useEffect(() => {
    let cancelled = false;
    async function syncFav() {
      const rNum = Number(reunion?.numOfficiel);
      const cNum = Number(course?.numOrdre);
      if (!rNum || !cNum) {
        setFavId(null);
        return;
      }
      try {
        const rows = await listFavorites();
        if (cancelled) return;
        const found = (Array.isArray(rows) ? rows : []).find(
          (row) =>
            String(row?.data?.date ?? "") === String(dateValue ?? "") &&
            Number(row?.data?.reunion) === rNum &&
            Number(row?.data?.course) === cNum
        );
        setFavId(found?.id ? String(found.id) : null);
      } catch {
        if (!cancelled) setFavId(null);
      }
    }
    syncFav();
    return () => {
      cancelled = true;
    };
  }, [dateValue, reunion, course]);

  const byNum = useMemo(() => {
    const map = new Map<number, Participant>();
    for (const p of participants) {
      const num = Number(p?.numPmu);
      if (Number.isFinite(num)) map.set(num, p);
    }
    return map;
  }, [participants]);

  const sortedParts = useMemo(() => {
    return [...participants].sort((a, b) => (Number(a?.numPmu) || 99) - (Number(b?.numPmu) || 99));
  }, [participants]);

  const jeux = uniqueParis(course?.paris);

  async function toggleFavorite() {
    const rNum = Number(reunion?.numOfficiel);
    const cNum = Number(course?.numOrdre);
    if (!rNum || !cNum || favBusy || !course || !reunion) return;
    setFavBusy(true);
    try {
      if (favId) {
        await removeFavorite(favId);
        setFavId(null);
      } else {
        const payload: FavoriteCourse = {
          date: String(dateValue ?? ""),
          reunion: rNum,
          course: cNum,
          hippodrome: hippodromeLabel(reunion),
          libelle: String(course.libelle || `Course ${cNum}`),
          heure: formatHeure(course.heureDepart),
        };
        const row = await addFavorite(payload);
        setFavId(row?.id ? String(row.id) : null);
      }
    } catch (err) {
      setError(err instanceof Error ? String(err.message ?? "") : "Impossible d'enregistrer ce favori pour le moment.");
    } finally {
      setFavBusy(false);
    }
  }

  return (
    <div>
      <Header
        dateValue={dateValue}
        date={date}
        loading={loadingProgramme || loading}
        onDateChange={onDateChange}
        onRefresh={onRefresh}
      />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 pb-8">
        {loadingProgramme ? <LoadingBlock label="Chargement des réunions…" /> : null}
        {!loadingProgramme && programmeError ? <ErrorBlock message={programmeError} onRetry={onRefresh} /> : null}
        {!loadingProgramme && !programmeError && list.length === 0 ? (
          <EmptyBlock message="Aucune course n'est au programme pour cette date." />
        ) : null}

        {!loadingProgramme && !programmeError && list.length > 0 ? (
          <>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {list.map((r, index) => {
                const active = Number(r?.numOfficiel) === Number(reunion?.numOfficiel);
                return (
                  <button
                    key={`rr-${String(r?.numOfficiel ?? index)}`}
                    type="button"
                    onClick={() => {
                      const first = Number(r?.courses?.[0]?.numOrdre);
                      const num = Number(r?.numOfficiel);
                      if (num && first) onSelect(num, first);
                    }}
                    className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${
                      active ? "bg-amber-400 text-[#062214]" : "border border-emerald-700 bg-[#0a3320] text-emerald-50"
                    }`}
                  >
                    R{String(r?.numOfficiel ?? "")} · {hippodromeLabel(r)}
                  </button>
                );
              })}
            </div>

            {courses.length === 0 ? (
              <EmptyBlock message="Aucune course n'est publiée pour cette réunion." />
            ) : (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {courses.map((c, index) => {
                  const active = Number(c?.numOrdre) === Number(course?.numOrdre);
                  return (
                    <button
                      key={`cc-${String(c?.numOrdre ?? index)}`}
                      type="button"
                      onClick={() => {
                        const rNum = Number(reunion?.numOfficiel);
                        const cNum = Number(c?.numOrdre);
                        if (rNum && cNum) onSelect(rNum, cNum);
                      }}
                      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                        active ? "bg-amber-400 text-[#062214]" : "border border-amber-500/30 bg-[#123d28] text-amber-100"
                      }`}
                    >
                      C{String(c?.numOrdre ?? "")} · {formatHeure(c?.heureDepart)}
                    </button>
                  );
                })}
              </div>
            )}

            {course && reunion ? (
              <>
                <CourseCard reunion={reunion} course={course} favId={favId} favBusy={favBusy} onToggleFav={toggleFavorite} />
                <ArrivalBanner participants={participants} />
              </>
            ) : (
              <EmptyBlock message="Sélectionnez une course pour afficher sa fiche." />
            )}

            {loading ? <LoadingBlock label="Chargement des partants et du pronostic…" /> : null}
            {!loading && error ? <ErrorBlock message={error} onRetry={onRefresh} /> : null}

            {!loading && course && reunion ? (
              <PronosticBlock reunion={reunion} course={course} selection={selection} participants={byNum} commentaire={commentaire} jeux={jeux} />
            ) : null}

            {!loading && course && sortedParts.length === 0 && !error ? (
              <EmptyBlock message="Les partants de cette course ne sont pas encore publiés." />
            ) : null}

            {!loading && sortedParts.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-amber-50">
                  Partants <span className="text-sm font-medium text-emerald-200/70">({sortedParts.length})</span>
                </h3>
                <ul className="flex flex-col gap-2">
                  {sortedParts.map((p, index) => (
                    <PartantRow key={`${String(p?.numPmu ?? index)}-${String(p?.nom ?? "")}`} participant={p} />
                  ))}
                </ul>
              </section>
            ) : null}

            <ResponsiblePlay />
          </>
        ) : null}
      </main>
    </div>
  );
}

function CourseCard({
  reunion,
  course,
  favId,
  favBusy,
  onToggleFav,
}: {
  reunion: Reunion;
  course: Course;
  favId: string | null;
  favBusy: boolean;
  onToggleFav: () => void;
}) {
  return (
    <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#0e4630] to-[#08291b] p-4 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
            R{String(reunion.numOfficiel ?? "")} · {hippodromeLabel(reunion)} · C{String(course.numOrdre ?? "")}
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-white">
            {String(course.libelle || `Course ${String(course.numOrdre ?? "")}`)}
          </h2>
        </div>
        <button
          type="button"
          onClick={onToggleFav}
          disabled={favBusy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-amber-400/40 bg-[#062214] text-amber-300 disabled:opacity-60"
          aria-label={favId ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart className={`h-5 w-5 ${favId ? "fill-amber-300" : ""}`} />
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Meta label="Heure" value={formatHeure(course.heureDepart)} />
        <Meta label="Distance" value={course.distance ? `${String(course.distance)} m` : "—"} />
        <Meta label="Discipline" value={disciplineLabel(course)} />
        <Meta label="Partants" value={String(course.nombreDeclaresPartants ?? "—")} />
      </dl>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#062214]/70 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-emerald-300/70">{label}</dt>
      <dd className="text-sm font-bold text-amber-50">{value}</dd>
    </div>
  );
}

function PronosticBlock({
  reunion,
  course,
  selection,
  participants,
  commentaire,
  jeux,
}: {
  reunion: Reunion;
  course: Course;
  selection: SelectionItem[];
  participants: Map<number, Participant>;
  commentaire: string;
  jeux: { code: string; label: string; count: number }[];
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const gameList = Array.isArray(jeux) ? jeux : [];

  const ranked = useMemo(() => {
    const list = (Array.isArray(selection) ? selection : [])
      .filter((s) => (s?.num_partant ?? s?.numPartant) != null)
      .map((s, idx) => ({
        rang: Number(s.rang || idx + 1),
        num_partant: Number(s.num_partant ?? s.numPartant),
        nom: s.nom,
        cote_prob: Number(s.cote_prob ?? s.coteProb ?? 0),
      }));

    const existingNums = new Set(list.map((s) => s.num_partant));
    const allParts = Array.from(participants.values()).filter((p) => !isNonPartant(p));

    const sortedParts = [...allParts].sort((a, b) => {
      const ca = a.dernierRapportDirect?.rapport || 99;
      const cb = b.dernierRapportDirect?.rapport || 99;
      if (ca !== cb) return ca - cb;
      return (Number(a.numPmu) || 0) - (Number(b.numPmu) || 0);
    });

    for (const p of sortedParts) {
      if (list.length >= 9) break;
      const num = Number(p.numPmu);
      if (num && !existingNums.has(num)) {
        existingNums.add(num);
        list.push({
          rang: list.length + 1,
          num_partant: num,
          nom: p.nom,
          cote_prob: p.dernierRapportDirect?.rapport || 15,
        });
      }
    }

    return list.slice(0, 9).sort((a, b) => a.rang - b.rang);
  }, [selection, participants]);

  function getCategory(cote: number) {
    if (!cote || cote <= 6) {
      return {
        label: "Favori",
        badge: "bg-emerald-500/30 text-emerald-300 border-emerald-500/60 font-black",
        card: "border-emerald-500/50 bg-gradient-to-r from-emerald-950/80 via-[#08291b] to-[#08291b]",
      };
    }
    if (cote <= 16) {
      return {
        label: "Outsider",
        badge: "bg-amber-400/30 text-amber-200 border-amber-400/60 font-black",
        card: "border-amber-500/50 bg-gradient-to-r from-amber-950/80 via-[#08291b] to-[#08291b]",
      };
    }
    return {
      label: "Tocard",
      badge: "bg-rose-500/30 text-rose-200 border-rose-500/60 font-black",
      card: "border-rose-500/50 bg-gradient-to-r from-rose-950/80 via-[#08291b] to-[#08291b]",
    };
  }

  return (
    <section className="rounded-3xl border border-amber-500/25 bg-[#103c28] p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-amber-300 text-amber-300" />
          <h3 className="text-lg font-black text-amber-50">Pronostic Wague - Top 9</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-400 px-3.5 text-xs font-black text-[#062214] shadow hover:bg-amber-300"
        >
          <History className="h-4 w-4" />
          Historique & Écarts (1M - 1An)
        </button>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-emerald-100/80">Le pronostic détaillé n'est pas encore disponible pour cette course.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {ranked.map((item, index) => {
            const num = Number(item?.num_partant ?? item?.numPartant ?? 0);
            const horse = participants.get(num);
            const cote = Number(item?.cote_prob ?? item?.coteProb ?? horse?.dernierRapportDirect?.rapport ?? 10);
            const cat = getCategory(cote);

            return (
              <li key={`${String(item?.rang ?? index)}-${num}`} className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 shadow-md ${cat.card}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-[#062214]">
                    {String(item?.rang || index + 1)}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-400/50 text-sm font-bold text-amber-200">
                    {String(num || "–")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">
                    {String(horse?.nom || item?.nom || `N°${num}`)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cat.badge}`}>
                    {cat.label}
                  </span>
                  <span className="text-sm font-bold text-amber-300 w-14 text-right">{formatCote(cote)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <HistoryAnalysisModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        reunion={reunion}
        course={course}
        selection={selection}
        participants={participants}
      />

      {commentaire ? (
        <p className="mt-4 rounded-2xl bg-[#062214]/80 p-3 text-sm leading-relaxed text-emerald-50">{commentaire}</p>
      ) : (
        <p className="mt-4 text-sm text-emerald-200/60">Commentaire Wague non publié.</p>
      )}

      <div className="mt-4">
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-200">Combinaisons proposées</h4>
        {gameList.length === 0 ? (
          <p className="text-sm text-emerald-100/70">Aucun jeu chiffré n'est proposé sur cette course.</p>
        ) : ranked.length === 0 ? (
          <p className="text-sm text-emerald-100/70">Les combinaisons s'afficheront dès que la sélection Wague sera publiée.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {gameList.map((jeu) => {
              const picks = ranked.slice(0, jeu.count);
              const nums = picks
                .map((s) => s?.num_partant ?? s?.numPartant)
                .filter((n) => n != null)
                .map((n) => String(n));
              const incomplete = nums.length < jeu.count;
              return (
                <li
                  key={jeu.label}
                  className="flex flex-col gap-2 rounded-2xl border border-emerald-800 bg-[#08291b] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-white">{jeu.label}</p>
                    <p className="text-xs text-emerald-200/70">
                      {jeu.count} cheval{jeu.count > 1 ? "x" : ""} · bases de la sélection
                    </p>
                  </div>
                  <p className="text-lg font-black tracking-wide text-amber-300">
                    {nums.length ? nums.join(" - ") : "—"}
                    {incomplete ? " · incomplet" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

interface RaceStatItem {
  token: string;
  pos: number | null;
  isTop3: boolean;
}

function calculateMusiqueSuccess(musique: string | undefined) {
  if (!musique || typeof musique !== "string") return { rate: 0, text: "Pas de données", races: [] as RaceStatItem[], top3Count: 0, total: 0 };
  const rawTokens = musique.trim().split(/\s+/).filter(Boolean);
  let tokens: string[] = [];
  if (rawTokens.length <= 1 && musique.length > 2) {
    const matches = musique.match(/(\d+[a-zA-Z]*|[a-zA-Z]\d*)/g);
    tokens = matches ? matches : rawTokens;
  } else {
    tokens = rawTokens;
  }

  const last5 = tokens.slice(0, 5);
  const races: RaceStatItem[] = [];
  let top3Count = 0;
  let total = 0;

  for (const t of last5) {
    const match = t.match(/^(\d+)/);
    if (match) {
      const pos = Number(match[1]);
      total++;
      const isTop3 = pos >= 1 && pos <= 3;
      if (isTop3) top3Count++;
      races.push({ token: t, pos, isTop3 });
    } else {
      races.push({ token: t, pos: null, isTop3: false });
    }
  }

  const rate = total > 0 ? Math.round((top3Count / total) * 100) : 0;
  return { rate, text: `${top3Count} place(s) dans le top 3 sur ${total || last5.length} courses`, races, top3Count, total: total || last5.length };
}

function PartantRow({ participant }: { participant: Participant }) {
  const np = isNonPartant(participant);
  const sexe = sexeLabel(participant?.sexe);
  const age = participant?.age ? `${String(participant.age)} ans` : "";
  const stats = calculateMusiqueSuccess(participant?.musique);

  return (
    <li className={`rounded-2xl border px-3.5 py-3.5 ${np ? "border-emerald-900 bg-[#07180f] opacity-60" : "border-emerald-800 bg-[#0b3222]"}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-base font-black text-[#062214]">
          {String(participant?.numPmu ?? "–")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-base font-bold text-white">
              {String(participant?.nom || "Cheval")}
              {np ? <span className="ml-2 text-xs font-semibold text-red-300">Non-partant</span> : null}
            </p>
            <p className="shrink-0 text-sm font-black text-amber-300">{formatCote(participant?.dernierRapportDirect?.rapport)}</p>
          </div>
          <p className="mt-0.5 text-sm text-emerald-100/80">{[age, sexe].filter(Boolean).join(" · ") || "Âge n.c."}</p>
          <p className="mt-1 text-sm text-emerald-50/90">
            <span className="text-emerald-300/70">Jockey / driver · </span>
            {driverOf(participant)}
          </p>
          <p className="text-sm text-emerald-50/90">
            <span className="text-emerald-300/70">Entraîneur · </span>
            {String(participant?.entraineur || "—")}
          </p>

          <div className="mt-2.5 rounded-2xl bg-[#062214]/80 p-3 border border-emerald-800/60">
            <div className="flex items-center justify-between gap-2 text-xs mb-2">
              <span className="font-bold text-emerald-200">Statistiques (5 dern. courses : Top 3)</span>
              <span className="font-black text-amber-300">{stats.rate}% ({stats.text})</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0a3320] mb-2.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                style={{ width: `${stats.rate}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-emerald-300/80 mr-1">Détail 5 courses :</span>
              {stats.races.length === 0 ? (
                <span className="text-[11px] text-emerald-400">Aucune donnée</span>
              ) : (
                stats.races.map((r, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-black ${
                      r.isTop3
                        ? "bg-amber-400 text-[#062214]"
                        : "bg-[#0a3320] border border-emerald-800 text-emerald-300"
                    }`}
                    title={r.isTop3 ? `Podium (${r.pos}°)` : `Course (${r.token})`}
                  >
                    {r.token}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function ArrivalBanner({ participants }: { participants: Participant[] }) {
  const arrived = participants.filter((p) => typeof p?.ordreArrivee === "number" && p.ordreArrivee > 0);
  if (arrived.length === 0) return null;
  arrived.sort((a, b) => (a.ordreArrivee || 99) - (b.ordreArrivee || 99));

  return (
    <section className="rounded-3xl border border-amber-400 bg-gradient-to-r from-amber-500/20 via-[#0b3a24] to-[#08291b] p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-3 text-amber-300">
        <Trophy className="h-5 w-5 fill-amber-300" />
        <h3 className="text-lg font-black text-amber-50">Arrivée Officielle (Réelle PMU)</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {arrived.map((p) => (
          <div key={p.numPmu} className="flex items-center gap-3 rounded-2xl bg-[#062214]/80 p-3 border border-amber-500/30">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-[#062214]">
              {p.ordreArrivee}°
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-300">N°{p.numPmu}</p>
              <p className="truncate font-bold text-white text-sm">{p.nom || "Cheval"}</p>
            </div>
            {p.dernierRapportDirect?.rapport ? (
              <span className="text-xs font-black text-amber-200">{formatCote(p.dernierRapportDirect.rapport)}</span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

