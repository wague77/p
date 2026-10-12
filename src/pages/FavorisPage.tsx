import React, { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import ResponsiblePlay from "../components/ResponsiblePlay";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/StatusMessage";
import { listFavorites, removeFavorite, type DbRow, type FavoriteCourse } from "../lib/db";
import { useNav } from "../lib/nav";

interface Props {
  onOpen: (date: string, reunion: number, course: number) => void;
}

export default function FavorisPage({ onOpen }: Props) {
  const { navigate } = useNav();
  const [rows, setRows] = useState<DbRow<FavoriteCourse>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await listFavorites();
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? String(err.message || "") : "Impossible de lire les favoris.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    try {
      await removeFavorite(id);
      setRows((prev) => (Array.isArray(prev) ? prev : []).filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? String(err.message || "") : "Suppression impossible.");
    }
  }

  const list = Array.isArray(rows) ? rows : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-5 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Mémo partagé</p>
        <h1 className="text-2xl font-black text-white">Courses favorites</h1>
        <p className="mt-1 text-sm text-emerald-100/75">
          Les courses épinglées sont enregistrées pour tous les utilisateurs de l'application.
        </p>
      </header>
      <ResponsiblePlay />
      {loading ? <LoadingBlock label="Chargement des favoris…" /> : null}
      {!loading && error ? <ErrorBlock message={error} onRetry={load} /> : null}
      {!loading && !error && list.length === 0 ? (
        <EmptyBlock message="Aucune course en favori. Ouvrez une course et touchez le cœur pour la garder." />
      ) : null}
      <ul className="flex flex-col gap-3">
        {list.map((row) => {
          const data = row?.data || ({} as FavoriteCourse);
          return (
            <li key={String(row?.id || data.libelle)} className="rounded-2xl border border-emerald-800 bg-[#0b3222] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-[#062214]">
                  <Heart className="h-5 w-5 fill-[#062214]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    {String(data.date || "Date")} · R{String(data.reunion ?? "")} C{String(data.course ?? "")}
                  </p>
                  <p className="truncate text-base font-bold text-white">{String(data.libelle || "Course")}</p>
                  <p className="text-sm text-emerald-100/75">
                    {String(data.hippodrome || "Hippodrome")} · {String(data.heure || "—")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!data.date || !data.reunion || !data.course) return;
                    onOpen(String(data.date), Number(data.reunion), Number(data.course));
                    navigate("/partants");
                  }}
                  className="min-h-11 flex-1 rounded-xl bg-amber-400 text-sm font-bold text-[#062214]"
                >
                  Voir les partants
                </button>
                <button
                  type="button"
                  onClick={() => remove(String(row?.id || ""))}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-red-400/40 text-red-200"
                  aria-label="Retirer le favori"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
