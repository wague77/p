import React, { useEffect, useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/StatusMessage";
import {
  listRequests,
  setRequestStatus,
  statusLabel,
  type AccessRequest,
  type ApprovalStatus,
} from "../lib/approval";
import type { DbRow } from "../lib/db";

export default function ApprobationsPage() {
  const [rows, setRows] = useState<DbRow<AccessRequest>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await listRequests();
      const safe = Array.isArray(list) ? list : [];
      safe.sort((a, b) => String(b?.data?.createdAt ?? "").localeCompare(String(a?.data?.createdAt ?? "")));
      setRows(safe);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? String(err.message ?? "") : "Impossible de lire les demandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, status: ApprovalStatus) {
    setBusyId(id);
    setError("");
    try {
      await setRequestStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? String(err.message ?? "") : "Mise à jour impossible.");
    } finally {
      setBusyId("");
    }
  }

  const list = Array.isArray(rows) ? rows : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-5 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Contrôle d'accès</p>
        <h1 className="text-2xl font-black text-white">Approbations</h1>
        <p className="mt-1 text-sm text-emerald-100/75">
          Chaque installation doit être approuvée avant d'ouvrir le programme. Approuvez ou refusez les
          demandes ci-dessous.
        </p>
      </header>
      {loading ? <LoadingBlock label="Chargement des demandes…" /> : null}
      {!loading && error ? <ErrorBlock message={error} onRetry={load} /> : null}
      {!loading && !error && list.length === 0 ? (
        <EmptyBlock message="Aucune demande d'accès pour le moment." />
      ) : null}
      <ul className="flex flex-col gap-3">
        {list.map((row) => {
          const data = row?.data;
          const id = String(row?.id ?? "");
          const status = String(data?.status ?? "pending");
          return (
            <li key={id || String(data?.deviceId ?? "")} className="rounded-2xl border border-emerald-800 bg-[#0b3222] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-white">{String(data?.name || "Sans nom")}</p>
                  <p className="text-sm text-emerald-100/80">{String(data?.contact || "Contact non précisé")}</p>
                  {data?.message ? <p className="mt-2 text-sm text-emerald-50/90">{String(data.message)}</p> : null}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-amber-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {statusLabel(status)}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === id || status === "approved"}
                  onClick={() => decide(id, "approved")}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-[#062214] disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Approuver
                </button>
                <button
                  type="button"
                  disabled={busyId === id || status === "rejected"}
                  onClick={() => decide(id, "rejected")}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/40 text-sm font-bold text-red-100 disabled:opacity-50"
                >
                  <X className="h-4 w-4" /> Refuser
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
