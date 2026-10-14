import React from "react";
import { Flag } from "lucide-react";
import { formatCote } from "../lib/pmu";
import type { ArriveeEntry } from "../lib/types";

export default function ArriveeBlock({
  entries,
  compact,
}: {
  entries: ArriveeEntry[];
  compact?: boolean;
}) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) return null;
  const shown = compact ? list.slice(0, 5) : list;
  return (
    <section className="rounded-2xl border border-amber-500/40 bg-[#12381f] p-3">
      <div className="mb-2 flex items-center gap-2">
        <Flag className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-black uppercase tracking-wide text-amber-200">
          Arrivée {compact ? "" : "officielle"}
        </h3>
      </div>
      <ol className="flex flex-col gap-1.5">
        {shown.map((row) => (
          <li
            key={`${row.place}-${row.numPmu}-${row.nom}`}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[#062214] px-2 py-1.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-[#062214]">
              {String(row.place)}
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-400/50 text-sm font-bold text-amber-200">
              {String(row.numPmu || "–")}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
              {String(row.nom || `N°${row.numPmu || "–"}`)}
              {row.statut ? <span className="ml-2 text-xs font-medium text-emerald-200/70">{row.statut}</span> : null}
            </span>
            {!compact && row.ecart ? <span className="text-xs text-emerald-100/70">{row.ecart}</span> : null}
            {!compact ? <span className="text-sm font-bold text-amber-300">{formatCote(row.rapport)}</span> : null}
          </li>
        ))}
      </ol>
      {compact && list.length > shown.length ? (
        <p className="mt-2 text-xs text-emerald-100/70">
          {list.slice(0, 5).map((row) => String(row.numPmu || "–")).join(" - ")}
          {list.length > 5 ? "…" : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm font-black tracking-wide text-amber-300">
          {list.map((row) => String(row.numPmu || "–")).join(" - ")}
        </p>
      )}
    </section>
  );
}
