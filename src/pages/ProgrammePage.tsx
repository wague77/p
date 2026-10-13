import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import Header from "../components/Header";
import ResponsiblePlay from "../components/ResponsiblePlay";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/StatusMessage";
import { useNav } from "../lib/nav";
import {
  courseCount,
  disciplineLabel,
  formatHeure,
  hippodromeLabel,
  parseInputDate,
  paysLabel,
  toInputDate,
  uniqueParis,
} from "../lib/pmu";
import type { Course, Reunion } from "../lib/types";
import { isRealQuinteCourse } from "../lib/quinteHistory";

const DATE_KEY = "partants-pmu-date";

interface Props {
  reunions: Reunion[];
  loading: boolean;
  error: string;
  dateValue: string;
  onDateChange: (value: string) => void;
  onRefresh: () => void;
  onOpenCourse: (reunion: number, course: number) => void;
}

export function useProgrammeDate() {
  const [dateValue, setDateValue] = useState(() => {
    try {
      const stored = localStorage.getItem(DATE_KEY);
      return stored && /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : toInputDate(new Date());
    } catch {
      return toInputDate(new Date());
    }
  });

  function onDateChange(value: string) {
    const next = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : toInputDate(new Date());
    setDateValue(next);
    try {
      localStorage.setItem(DATE_KEY, next);
    } catch {
      /* préférence locale optionnelle */
    }
  }

  const date = useMemo(() => parseInputDate(dateValue), [dateValue]);
  return { dateValue, date, onDateChange };
}

export default function ProgrammePage({
  reunions,
  loading,
  error,
  dateValue,
  onDateChange,
  onRefresh,
  onOpenCourse,
}: Props) {
  const { navigate } = useNav();
  const list = Array.isArray(reunions) ? reunions : [];
  const [selectedR, setSelectedR] = useState<number | null>(null);
  const date = useMemo(() => parseInputDate(dateValue), [dateValue]);

  useEffect(() => {
    if (!list.length) {
      setSelectedR(null);
      return;
    }
    const still = list.some((r) => Number(r?.numOfficiel) === selectedR);
    if (!still) setSelectedR(Number(list[0]?.numOfficiel) || null);
  }, [list, selectedR]);

  const reunion = list.find((r) => Number(r?.numOfficiel) === selectedR) || list[0];
  const courses = Array.isArray(reunion?.courses) ? reunion.courses : [];
  const total = courseCount(list);

  function openCourse(course: Course) {
    const rNum = Number(reunion?.numOfficiel);
    const cNum = Number(course?.numOrdre);
    if (!rNum || !cNum) return;
    onOpenCourse(rNum, cNum);
    navigate("/partants");
  }

  return (
    <div>
      <Header
        dateValue={dateValue}
        date={date}
        loading={loading}
        onDateChange={onDateChange}
        onRefresh={onRefresh}
      />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 pb-8">
        <ResponsiblePlay />

        {loading ? <LoadingBlock /> : null}
        {!loading && error ? <ErrorBlock message={error} onRetry={onRefresh} /> : null}

        {!loading && !error && list.length === 0 ? (
          <EmptyBlock message="Aucune réunion n'est publiée pour cette date. Choisissez un autre jour ou actualisez le programme." />
        ) : null}

        {!loading && !error && list.length > 0 ? (
          <>
            <section>
              <h2 className="text-lg font-bold text-amber-50">Réunions du jour</h2>
              <p className="text-sm text-emerald-200/75">
                {list.length} réunion{list.length > 1 ? "s" : ""} · {total} course
                {total > 1 ? "s" : ""}
              </p>
            </section>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {list.map((r, index) => {
                const num = Number(r?.numOfficiel) || index + 1;
                const active = Number(r?.numOfficiel) === Number(reunion?.numOfficiel);
                return (
                  <button
                    key={`r-${num}-${index}`}
                    type="button"
                    onClick={() => setSelectedR(Number(r?.numOfficiel) || null)}
                    className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${
                      active
                        ? "bg-amber-400 text-[#062214]"
                        : "border border-emerald-700 bg-[#0a3320] text-emerald-50"
                    }`}
                  >
                    R{num} · {hippodromeLabel(r)}
                  </button>
                );
              })}
            </div>

            {reunion ? (
              <section className="rounded-2xl border border-emerald-800 bg-[#0b3a24] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                      Réunion {String(reunion.numOfficiel ?? "")}
                    </p>
                    <h3 className="text-xl font-black text-white">{hippodromeLabel(reunion)}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-emerald-100/80">
                      <MapPin className="h-4 w-4 text-amber-300" />
                      {[paysLabel(reunion), String(reunion.nature ?? "")]
                        .filter(Boolean)
                        .join(" · ") || "Hippodrome"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-amber-200">
                    {courses.length} course{courses.length > 1 ? "s" : ""}
                  </span>
                </div>
              </section>
            ) : null}

            {courses.length === 0 ? (
              <EmptyBlock message="Cette réunion ne contient aucune course pour le moment." />
            ) : (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {courses.map((c, index) => (
                  <button
                    key={`c-${String(c?.numOrdre ?? index)}`}
                    type="button"
                    onClick={() => openCourse(c)}
                    className="min-h-11 shrink-0 rounded-full border border-amber-500/40 bg-[#123d28] px-4 text-sm font-semibold text-amber-100"
                  >
                    C{String(c?.numOrdre ?? "")} · {formatHeure(c?.heureDepart)}
                  </button>
                ))}
              </div>
            )}

            <ul className="flex flex-col gap-3">
              {courses.map((c, index) => {
                const jeux = uniqueParis(c?.paris);
                return (
                  <li key={`card-${String(c?.numOrdre ?? index)}`}>
                    <button
                      type="button"
                      onClick={() => openCourse(c)}
                      className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-emerald-800 bg-[#08291b] p-4 text-left active:scale-[0.99]"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-lg font-black text-[#062214]">
                        {String(c?.numOrdre ?? "–")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="block truncate text-base font-bold text-white">
                            {String(c?.libelle || `Course ${String(c?.numOrdre ?? "")}`)}
                          </span>
                          {isRealQuinteCourse(c, reunion?.numOfficiel) ? (
                            <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#062214]">
                              ⭐ QUINTÉ+ R1
                            </span>
                          ) : null}
                        </div>
                        <span className="mt-1 block text-sm text-emerald-100/75">
                          {formatHeure(c?.heureDepart)} ·{" "}
                          {c?.distance ? `${String(c.distance)} m` : "Distance n.c."} · {disciplineLabel(c)} ·{" "}
                          {String(c?.nombreDeclaresPartants ?? "?")} partants
                        </span>
                        {jeux.length > 0 ? (
                          <span className="mt-2 flex flex-wrap gap-1">
                            {jeux.slice(0, 4).map((j) => (
                              <span
                                key={j.label}
                                className="rounded-full bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-amber-200"
                              >
                                {j.label}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-amber-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </main>
    </div>
  );
}
