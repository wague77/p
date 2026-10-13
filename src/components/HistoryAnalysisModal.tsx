import React, { useState, useEffect, useMemo } from "react";
import { History, TrendingUp, Award, Calendar, X, BarChart2, ShieldAlert, CheckCircle, Flame, Star, Zap, Loader2 } from "lucide-react";
import type { Course, Participant, Reunion, SelectionItem } from "../lib/types";
import { formatCote } from "../lib/pmu";
import { getRealQuinteHistory, filterRecordsByRange, calculateRealQuinteStats, computeReliableQuintePrediction, fetchAndPopulateRecentQuintes, TimeRange, RealQuinteRecord } from "../lib/quinteHistory";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reunion: Reunion;
  course: Course;
  selection: SelectionItem[];
  participants: Map<number, Participant>;
}

export default function HistoryAnalysisModal({ isOpen, onClose, reunion, course, selection, participants }: Props) {
  const [range, setRange] = useState<TimeRange>("3m");
  const [activeTab, setActiveTab] = useState<"predictions" | "history">("predictions");
  const [loadingPast, setLoadingPast] = useState(false);

  const records = useMemo(() => getRealQuinteHistory(range), [range]);
  const stats = useMemo(() => calculateRealQuinteStats(records), [records]);

  const rawSelection = (Array.isArray(selection) ? selection : []).map(s => ({
    num_partant: s.num_partant ?? s.numPartant,
    cote_prob: s.cote_prob ?? s.coteProb,
    nom: s.nom,
  }));

  const reliablePredictions = useMemo(() => computeReliableQuintePrediction(rawSelection, stats), [rawSelection, stats]);

  if (!isOpen) return null;

  function getCategory(cote: number): { label: string; badge: string; bg: string } {
    if (!cote || cote <= 6) {
      return { label: "Favori", badge: "bg-emerald-500 text-[#062214]", bg: "bg-emerald-950/60 border-emerald-600/40" };
    }
    if (cote <= 16) {
      return { label: "Outsider", badge: "bg-amber-400 text-[#062214]", bg: "bg-amber-950/40 border-amber-600/40" };
    }
    return { label: "Tocard", badge: "bg-rose-500 text-white", bg: "bg-rose-950/40 border-rose-600/40" };
  }

  const rangeLabels: Record<TimeRange, string> = {
    "1m": "1 mois (15 courses)",
    "3m": "3 mois (45 courses)",
    "1y": "1 an (120 courses)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-amber-500/30 bg-[#062214] p-6 text-emerald-50 shadow-2xl overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Fermer</span>
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#062214] shadow-lg">
            <Flame className="h-6 w-6 font-black" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Passé Quinté+ & Écarts</p>
            <h2 className="text-xl font-black text-white">Historique Quinté+ ({rangeLabels[range]}) & Pronostic Fiable</h2>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#0a3320] p-2 border border-emerald-800">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 text-xs font-bold text-amber-300">
              <Calendar className="h-4 w-4" /> Période :
            </span>
            {(["1m", "3m", "1y"] as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  range === r ? "bg-amber-400 text-[#062214] shadow" : "bg-transparent text-emerald-200 hover:bg-emerald-800/50"
                }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs: Predictions vs History Table */}
        <div className="mb-5 flex border-b border-emerald-800">
          <button
            type="button"
            onClick={() => setActiveTab("predictions")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === "predictions" ? "border-amber-400 text-amber-300" : "border-transparent text-emerald-300/70 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4" /> Pronostic Quinté+ Fiable (Écarts Réels)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === "history" ? "border-amber-400 text-amber-300" : "border-transparent text-emerald-300/70 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" /> Historique & Arrivées Complètes ({records.length})
          </button>
        </div>

        {activeTab === "predictions" ? (
          <div className="flex flex-col gap-5">
            {/* Real Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-emerald-800 bg-[#0b3222] p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-emerald-300/80">Écart Favori</p>
                <p className="text-xl font-black text-emerald-300 mt-1">{stats.ecartFavori} courses</p>
                <p className="text-[11px] text-emerald-200/60 mt-0.5">Succès : {stats.favoriSuccessRate}%</p>
              </div>
              <div className="rounded-2xl border border-amber-800/60 bg-[#0b3222] p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-amber-300/80">Écart Outsider ⚡</p>
                <p className="text-xl font-black text-amber-300 mt-1">{stats.ecartOutsider} courses</p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">Zone favorable</p>
              </div>
              <div className="rounded-2xl border border-rose-800/60 bg-[#0b3222] p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-rose-300/80">Écart Tocard</p>
                <p className="text-xl font-black text-rose-300 mt-1">{stats.ecartTocard} courses</p>
                <p className="text-[11px] text-emerald-200/60 mt-0.5">Surprise potentielle</p>
              </div>
              <div className="rounded-2xl border border-emerald-800 bg-[#0b3222] p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-emerald-300/80">Quinté+ Réel</p>
                <p className="text-xl font-black text-amber-400 mt-1">{stats.quinteReussiteRate}%</p>
                <p className="text-[11px] text-emerald-200/60 mt-0.5">{stats.totalRaces} sur {rangeLabels[range]}</p>
              </div>
            </div>

            {/* Reliable Prediction Results */}
            <div className="rounded-3xl border border-amber-400 bg-gradient-to-r from-amber-500/20 via-[#0b3a24] to-[#08291b] p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3 text-amber-300">
                <Star className="h-5 w-5 fill-amber-300" />
                <h3 className="text-base font-black text-amber-50">Sélection Quinté+ Optimisée ({rangeLabels[range]})</h3>
              </div>
              <p className="text-xs leading-relaxed text-emerald-100/90 mb-4">
                Calculs mathématiques réels des écarts et des cotes extraits des courses de Quinté+ pour la période de {rangeLabels[range]} :
              </p>

              {reliablePredictions.length === 0 ? (
                <p className="text-xs text-emerald-300/70">Aucune sélection disponible pour cette course.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {reliablePredictions.map((item, idx) => {
                    const horse = participants.get(item.num);
                    const cat = getCategory(item.cote);
                    return (
                      <div
                        key={item.num}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[#062214]/90 p-3.5 border border-amber-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-[#062214]">
                            {idx + 1}°
                          </span>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-xs font-bold text-white">
                            {item.num}
                          </span>
                          <div>
                            <p className="font-bold text-white text-sm">{horse?.nom || item.nom || `N°${item.num}`}</p>
                            <p className="text-xs text-emerald-200/70">
                              Cote : {formatCote(item.cote)} · Score de fiabilité : <strong className="text-amber-300">{item.reliabilityScore}</strong>
                            </p>
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${cat.badge}`}>
                          {cat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-emerald-200/80">
              Affichage complet des arrivées et pronostics Wague (5 chevaux complets) pour la période <strong className="text-amber-300">{rangeLabels[range]}</strong> ({records.length} courses) :
            </p>
            <div className="max-h-[420px] overflow-y-auto pr-1 flex flex-col gap-2.5">
              {records.map((rec) => (
                <div key={rec.id} className="rounded-2xl border border-emerald-800 bg-[#0b3222] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-300">{rec.date} · {rec.hippodrome}</span>
                    <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                      {rec.prix}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[#062214] p-2.5">
                      <p className="text-[11px] text-emerald-300/70 mb-1">Pronostic Wague (5 chevaux) :</p>
                      <p className="font-bold text-amber-200">{rec.pronosticWague.join(" - ")}</p>
                    </div>
                    <div className="rounded-xl bg-[#062214] p-2.5">
                      <p className="text-[11px] text-emerald-300/70 mb-1">Arrivée Officielle (Top 5) :</p>
                      <p className="font-bold text-white">{rec.arriveeOfficielle.join(" - ")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl bg-amber-400 px-6 text-sm font-bold text-[#062214] shadow hover:bg-amber-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
