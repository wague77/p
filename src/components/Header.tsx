import React from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { formatLongDate } from "../lib/pmu";

interface Props {
  dateValue: string;
  date: Date;
  loading: boolean;
  onDateChange: (value: string) => void;
  onRefresh: () => void;
}

export default function Header({ dateValue, date, loading, onDateChange, onRefresh }: Props) {
  const safeValue = String(dateValue ?? "");
  return (
    <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-[#062214]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-[#062214] shadow-lg shadow-amber-900/40">
            <span className="text-lg font-black tracking-tight">P</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
              Turf · Programme officiel
            </p>
            <h1 className="text-xl font-black leading-none text-amber-50">Partants PMU</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-emerald-800 bg-[#0a3320] px-3 text-sm text-emerald-50 sm:flex-none">
            <CalendarDays className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="sr-only">Choisir une date</span>
            <input
              type="date"
              value={safeValue}
              onChange={(e) => onDateChange(String(e.target.value ?? ""))}
              className="min-h-11 w-full bg-transparent py-2 text-sm text-emerald-50 outline-none [color-scheme:dark]"
            />
          </label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-[#062214] shadow-md shadow-amber-900/30 active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-3 text-sm capitalize text-emerald-200/80">
        {formatLongDate(date)}
      </p>
    </header>
  );
}
