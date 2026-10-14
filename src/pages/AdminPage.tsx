import React, { useMemo, useState } from "react";
import { Lock, LogOut, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/StatusMessage";
import {
  isAdminLocked,
  isAdminSession,
  logoutAdmin,
  remainingAttempts,
  tryAdminLogin,
} from "../lib/adminAuth";
import {
  listRequests,
  setRequestStatus,
  statusLabel,
  type AccessRequest,
  type ApprovalStatus,
} from "../lib/approval";
import type { DbRow } from "../lib/db";

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => isAdminSession());
  const [locked, setLocked] = useState(() => isAdminLocked());
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [left, setLeft] = useState(() => remainingAttempts());
  const [rows, setRows] = useState<DbRow<AccessRequest>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState<"all" | ApprovalStatus>("all");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await listRequests();
      const safe = Array.isArray(list) ? list : [];
      safe.sort((a, b) => String(b?.data?.createdAt ?? "").localeCompare(String(a?.data?.createdAt ?? "")));
      setRows(safe);
      setLoaded(true);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? String(err.message ?? "") : "Impossible de lire les demandes.");
    } finally {
      setLoading(false);
    }
  }

  function onLogin(event: React.FormEvent) {
    event.preventDefault();
    const result = tryAdminLogin(password);
    setPassword("");
    setLeft(result.remaining);
    setLocked(result.locked);
    setLoginError(result.ok ? "" : result.message);
    if (result.ok) {
      setAuthed(true);
      load();
    }
  }

  function onLogout() {
    logoutAdmin();
    setAuthed(false);
    setRows([]);
    setLoaded(false);
  }

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
  const counts = useMemo(() => {
    const base = { all: list.length, pending: 0, approved: 0, rejected: 0 };
    for (const row of list) {
      const status = String(row?.data?.status ?? "pending");
      if (status === "approved") base.approved += 1;
      else if (status === "rejected") base.rejected += 1;
      else base.pending += 1;
    }
    return base;
  }, [list]);
  const visible = list.filter((row) => filter === "all" || String(row?.data?.status ?? "pending") === filter);

  if (locked) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-8">
        <div className="rounded-3xl border border-red-400/40 bg-red-950/40 p-5 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-200" />
          <h1 className="mt-3 text-2xl font-black text-white">Admin bloqué</h1>
          <p className="mt-2 text-sm leading-relaxed text-red-100">
            Deux tentatives de mot de passe incorrectes. La connexion admin est bloquée sur cet appareil.
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-[#062214]">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">Zone réservée</p>
            <h1 className="text-2xl font-black text-white">Connexion admin</h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-emerald-100/80">
          Seul le mot de passe admin ouvre le tableau de bord. Après deux erreurs, l'accès est bloqué
          sur cet appareil.
        </p>
        <form onSubmit={onLogin} className="flex flex-col gap-3 rounded-2xl border border-emerald-800 bg-[#0b3222] p-4">
          <label className="flex flex-col gap-1 text-sm">
            Mot de passe
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(String(e.target.value ?? ""))}
              className="min-h-11 rounded-xl border border-emerald-800 bg-[#062214] px-3 text-emerald-50 outline-none"
              placeholder="Mot de passe admin"
            />
          </label>
          <button type="submit" className="min-h-11 rounded-xl bg-amber-400 text-sm font-bold text-[#062214]">
            Entrer
          </button>
          <p className="text-xs text-emerald-200/70">Tentatives restantes : {left}</p>
          {loginError ? <p className="text-sm text-red-200">{loginError}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-5 pb-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Tableau de bord</p>
          <h1 className="text-2xl font-black text-white">Admin · approbations</h1>
          <p className="mt-1 text-sm text-emerald-100/75">Approuvez ou refusez chaque demande d'accès.</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/40 px-3 text-sm font-semibold text-amber-200"
        >
          <LogOut className="h-4 w-4" /> Quitter
        </button>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="En attente" value={counts.pending} />
        <Stat label="Approuvées" value={counts.approved} />
        <Stat label="Refusées" value={counts.rejected} />
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Toutes"],
            ["pending", "En attente"],
            ["approved", "Approuvées"],
            ["rejected", "Refusées"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`min-h-11 rounded-full px-4 text-sm font-bold ${
              filter === key ? "bg-amber-400 text-[#062214]" : "border border-emerald-700 bg-[#0a3320] text-emerald-50"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-400/40 px-4 text-sm font-semibold text-amber-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>

      {!loaded && !loading ? (
        <button type="button" onClick={load} className="min-h-11 rounded-xl bg-amber-400 text-sm font-bold text-[#062214]">
          Charger les demandes
        </button>
      ) : null}
      {loading ? <LoadingBlock label="Chargement du tableau de bord…" /> : null}
      {!loading && error ? <ErrorBlock message={error} onRetry={load} /> : null}
      {!loading && loaded && !error && visible.length === 0 ? (
        <EmptyBlock message="Aucune demande dans ce filtre." />
      ) : null}

      <ul className="flex flex-col gap-3">
        {visible.map((row) => {
          const data = row?.data;
          const id = String(row?.id ?? "");
          const status = String(data?.status ?? "pending");
          return (
            <li key={id || String(data?.deviceId ?? "")} className="rounded-2xl border border-emerald-800 bg-[#0b3222] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{String(data?.name || "Sans nom")}</p>
                  <p className="text-sm text-emerald-100/80">{String(data?.contact || "Contact non précisé")}</p>
                  {data?.message ? <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">{String(data.message)}</p> : null}
                  <p className="mt-2 text-xs text-emerald-200/60">
                    {String(data?.createdAt || "").replace("T", " ").slice(0, 16) || "Date inconnue"}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-amber-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {statusLabel(status)}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === id || status === "approved"}
                  onClick={() => decide(id, "approved")}
                  className="min-h-11 flex-1 rounded-xl bg-amber-400 text-sm font-bold text-[#062214] disabled:opacity-50"
                >
                  Approuver
                </button>
                <button
                  type="button"
                  disabled={busyId === id || status === "rejected"}
                  onClick={() => decide(id, "rejected")}
                  className="min-h-11 flex-1 rounded-xl border border-red-400/40 text-sm font-bold text-red-100 disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-emerald-800 bg-[#0b3222] px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-emerald-300/70">{label}</p>
      <p className="text-2xl font-black text-amber-300">{String(value)}</p>
    </div>
  );
}
