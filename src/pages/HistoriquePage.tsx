import React, { useEffect, useMemo, useState } from "react";
import { History, Sparkles, Trophy } from "lucide-react";
import ResponsiblePlay from "../components/ResponsiblePlay";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/StatusMessage";
import {
  PRONO_TOP,
  buildReport,
  coteText,
  currentQuinteHorses,
  findQuinte,
  formatStampLabel,
  loadHistory,
  rangeLabel,
  type HistoryRange,
  type HistoryReport,
} from "../lib/history";
import {
  fetchParticipants,
  fetchPronostics,
  formatHeure,
  hippodromeLabel,
  parseInputDate,
} from "../lib/pmu";
import type { Participant, Reunion, SelectionItem } from "../lib/types";

interface Props {
  reunions: Reunion[];
  dateValue: string;
  loadingProgramme: boolean;
}

const RANGES: HistoryRange[] = ["1m", "3m", "1y"];

export default function HistoriquePage({ reunions, dateValue, loadingProgramme }: Props) {
  const [range, setRange] = useState<HistoryRange>("1m");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<HistoryReport | null>(null);
  const date = useMemo(() => parseInputDate(dateValue), [dateValue]);
  const quinte = useMemo(() => findQuinte(Array.isArray(reunions) ? reunions : []), [reunions]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      setReport(null);
      setProgress("Recherche du Quinté de la réunion…");
      try {
        let advice = undefined;
        let next: HistoryReport["next"] = null;
        if (quinte) {
          const rNum = Number(quinte.reunion.numOfficiel);
          const cNum = Number(quinte.course.numOrdre);
          next = {
            reunion: rNum,
            course: cNum,
            hippodrome: hippodromeLabel(quinte.reunion),
            libelle: String(quinte.course.libelle || `Course ${cNum}`),
            heure: formatHeure(quinte.course.heureDepart),
            date: String(dateValue ?? ""),
          };
          const [parts, selection] = await Promise.all([
            fetchParticipants(date, rNum, cNum).catch(() => [] as Participant[]),
            fetchPronostics(date, rNum, cNum).catch(() => [] as SelectionItem[]),
          ]);
          advice = currentQuinteHorses(Array.isArray(selection) ? selection : [], Array.isArray(parts) ? parts : []);
        }
        const races = await loadHistory(range, date, (done, total) => {
          if (!cancelled) setProgress(`${done} / ${total} jours lus · Quintés uniquement`);
        });
        if (cancelled) return;
        setReport(buildReport(races, range === "1m" ? 31 : range === "3m" ? 92 : 366, next, advice));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? String(err.message ?? "") : "Historique indisponible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (!loadingProgramme) run();
    return () => {
      cancelled = true;
    };
  }, [range, date, dateValue, quinte, loadingProgramme]);

  const races = Array.isArray(report?.races) ? report.races : [];
  const advice = Array.isArray(report?.advice) ? report.advice : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-5 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Quinté seulement</p>
        <h1 className="text-2xl font-black text-white">Historique des pronostics</h1>
        <p className="mt-1 text-sm leading-relaxed text-emerald-100/80">
          Chaque pronostic affiche le top 8, pas seulement les cinq premiers. Arrivées des courses de
          Quinté sur 1 mois, 3 mois ou 1 an. Favoris, outsiders et tocard concernent le prochain Quinté.
        </p>
      </header>

      <div className="flex gap-2">
        {RANGES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`min-h-11 flex-1 rounded-full text-sm font-bold ${
              range === key ? "bg-amber-400 text-[#062214]" : "border border-emerald-700 bg-[#0a3320] text-emerald-50"
            }`}
          >
            {rangeLabel(key)}
          </button>
        ))}
      </div>

      <ResponsiblePlay />

      {loadingProgramme || loading ? (
        <LoadingBlock label={progress || "Lecture de l'historique Quinté…"} />
      ) : null}
      {!loading && error ? <ErrorBlock message={error} /> : null}

      {!loading && report ? (
        <>
          <section className="rounded-3xl border border-amber-500/30 bg-[#103c28] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-black text-white">Quinté à jouer</h2>
            </div>
            {report.next ? (
              <p className="text-sm text-emerald-100/85">
                R{String(report.next.reunion ?? "")} · {String(report.next.hippodrome || "")} · C
                {String(report.next.course ?? "")} · {String(report.next.heure || "")}
                <span className="mt-1 block font-semibold text-white">{String(report.next.libelle || "")}</span>
              </p>
            ) : (
              <p className="text-sm text-emerald-100/80">
                Aucun Quinté n'est au programme de cette date. L'historique reste consultable.
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Mini label="Top 8 dans l'arrivée" value={`${Math.round(Number(report.topRate) || 0)} %`} />
              <Mini label="Gagnant dans le top 8" value={`${Math.round(Number(report.winnerRate) || 0)} %`} />
              <Mini label="Quintés lus" value={String(report.quinteDays ?? 0)} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-emerald-200/70">
              Lecture statistique, pas une garantie. {String(report.quinteDays ?? 0)} course
              {Number(report.quinteDays) > 1 ? "s" : ""} de Quinté sur {rangeLabel(range)}.
            </p>
          </section>

          {advice.length === 0 ? (
            <EmptyBlock message="Le pronostic du prochain Quinté n'est pas encore publié. Revenez plus près du départ." />
          ) : (
            advice.map((block) => {
              const horses = Array.isArray(block?.horses) ? block.horses : [];
              return (
                <section key={String(block?.role || block?.title)} className="rounded-2xl border border-emerald-800 bg-[#0b3222] p-4">
                  <h3 className="font-black text-amber-200">{String(block?.title || "")}</h3>
                  <p className="mt-1 text-sm text-emerald-100/75">{String(block?.hint || "")}</p>
                  {horses.length === 0 ? (
                    <p className="mt-2 text-sm text-emerald-200/60">Aucun cheval dans cette catégorie.</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {horses.map((horse) => (
                        <li
                          key={`${String(block?.role)}-${String(horse?.num)}`}
                          className="flex min-h-11 items-center gap-2 rounded-xl bg-[#062214] px-3 py-2"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-[#062214]">
                            {String(horse?.num ?? "–")}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-semibold text-white">{String(horse?.nom || "Cheval")}</span>
                          <span className="text-sm font-bold text-amber-300">{coteText(Number(horse?.cote) || 0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          )}

          <section className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-black text-white">Pronostics top 8 et résultats</h2>
          </section>
          {races.length === 0 ? (
            <EmptyBlock message="Aucun Quinté publié sur cette période, ou les résultats ne sont pas encore disponibles." />
          ) : (
            <ul className="flex flex-col gap-3">
              {races.map((race) => {
                const picks = Array.isArray(race?.picks) ? race.picks : [];
                const hits = Number(race?.topHits) || 0;
                return (
                  <li
                    key={`${String(race?.date)}-${String(race?.reunion)}-${String(race?.course)}`}
                    className="rounded-2xl border border-emerald-800 bg-[#08291b] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-300">
                          {formatStampLabel(String(race?.date || ""))} · R{String(race?.reunion ?? "")} C
                          {String(race?.course ?? "")} · {String(race?.hippodrome || "")}
                        </p>
                        <p className="font-bold text-white">{String(race?.libelle || "Course")}</p>
                      </div>
                      <Trophy className="h-5 w-5 shrink-0 text-amber-300" />
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-300/70">
                      Pronostic top {PRONO_TOP}
                    </p>
                    <p className="text-sm font-black tracking-wide text-amber-200">{String(race?.pronostic || "—")}</p>
                    {picks.length > 0 ? (
                      <ol className="mt-2 flex flex-col gap-1">
                        {picks.map((horse, index) => (
                          <li
                            key={`${String(race?.date)}-${String(horse?.num)}-${index}`}
                            className="flex min-h-11 items-center gap-2 rounded-xl bg-[#062214] px-2 py-1.5"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-[#062214]">
                              {String(horse?.rang || index + 1)}
                            </span>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/40 text-xs font-bold text-amber-200">
                              {String(horse?.num ?? "–")}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                              {String(horse?.nom || "Cheval")}
                            </span>
                            <span className="text-xs font-bold text-amber-300">{coteText(Number(horse?.cote) || 0)}</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    <p className="mt-3 text-sm text-emerald-100/85">
                      Arrivée <span className="font-black text-white">{String(race?.arrivee || "—")}</span>
                    </p>
                    <p className="mt-1 text-xs text-emerald-200/60">
                      {Array.isArray(race?.finish) && race.finish.length > 0
                        ? `${hits}/${picks.length || PRONO_TOP} du top 8 dans les cinq premiers`
                        : "Arrivée non publiée"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#062214] px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-emerald-300/70">{label}</p>
      <p className="text-lg font-black text-amber-300">{value}</p>
    </div>
  );
}
