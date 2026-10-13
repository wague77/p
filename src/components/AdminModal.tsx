import React, { useState, useEffect } from "react";
import { Shield, CheckCircle2, XCircle, Clock, Lock, LogOut, X, RefreshCw, AlertTriangle } from "lucide-react";
import {
  listRequests,
  updateRequestStatus,
  isAdminLoggedIn,
  setAdminLogin,
  setAdminLogout,
  getAdminLockoutSeconds,
  ApprovalRequest,
} from "../lib/approval";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export default function AdminModal({ isOpen, onClose, onStatusUpdated }: Props) {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockoutSec, setLockoutSec] = useState(() => getAdminLockoutSeconds());
  const [requests, setRequests] = useState<ApprovalRequest[]>(listRequests);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!isOpen) return;
    setLockoutSec(getAdminLockoutSeconds());
    setLoggedIn(isAdminLoggedIn());
    setRequests(listRequests());
  }, [isOpen]);

  useEffect(() => {
    if (lockoutSec <= 0) return;
    const t = setInterval(() => {
      const s = getAdminLockoutSeconds();
      setLockoutSec(s);
      if (s <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutSec]);

  if (!isOpen) return null;

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = setAdminLogin(password);
    if (res.locked) {
      setLockoutSec(res.secondsLeft || 30);
      setError(`Accès verrouillé après 2 tentatives infructueuses. Veuillez patienter ${res.secondsLeft || 30}s.`);
      setPassword("");
      return;
    }
    if (res.success) {
      setLoggedIn(true);
      setPassword("");
      setRequests(listRequests());
    } else {
      const left = res.secondsLeft !== undefined ? res.secondsLeft : 1;
      setError(`Mot de passe incorrect. Il vous reste ${left} tentative${left > 1 ? "s" : ""} avant le verrouillage.`);
      setPassword("");
    }
  }

  function handleLogout() {
    setAdminLogout();
    setLoggedIn(false);
  }

  function handleAction(id: string, status: "approved" | "rejected") {
    const next = updateRequestStatus(id, status);
    setRequests(next);
    if (onStatusUpdated) onStatusUpdated();
  }

  function refreshList() {
    setRequests(listRequests());
  }

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-[#062214] p-6 text-emerald-50 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Fermer</span>
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#062214] shadow-lg">
            <Shield className="h-6 w-6 font-black" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Administration</p>
            <h2 className="text-xl font-black text-white">Gestion des demandes d'accès</h2>
          </div>
        </div>

        {!loggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4 py-4">
            {lockoutSec > 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
                <AlertTriangle className="h-6 w-6 shrink-0 text-red-400" />
                <div>
                  <p className="font-bold">Accès administrateur verrouillé</p>
                  <p className="text-xs text-red-300/80 mt-0.5">
                    Suite à 2 tentatives infructueuses, veuillez patienter <strong className="text-amber-300">{lockoutSec}s</strong> avant de réessayer.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-emerald-200">Mot de passe administrateur</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-5 w-5 text-emerald-400" />
                <input
                  type="password"
                  placeholder="Entrez le mot de passe (ex: admin2026)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={lockoutSec > 0}
                  className="w-full rounded-xl border border-emerald-800 bg-[#0a3320] py-3 pl-11 pr-4 text-sm text-white placeholder-emerald-600 outline-none focus:border-amber-400 disabled:opacity-50"
                  autoFocus
                />
              </div>
              <p className="text-xs text-emerald-300/70">
                Attention : l'accès est verrouillé après 2 tentatives infructueuses. (Essayez <strong className="text-amber-300">admin2026</strong> ou <strong className="text-amber-300">pmu</strong>)
              </p>
            </div>

            {error && lockoutSec <= 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={lockoutSec > 0}
              className="mt-2 min-h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 text-sm font-black text-[#062214] shadow-lg shadow-amber-900/30 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50"
            >
              {lockoutSec > 0 ? `Verrouillé (${lockoutSec}s)` : "Se connecter à l'administration"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/60 pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filter === "all" ? "bg-amber-400 text-[#062214]" : "bg-[#0a3320] text-emerald-200 hover:bg-emerald-800/60"
                  }`}
                >
                  Tous ({requests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("pending")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filter === "pending" ? "bg-amber-400 text-[#062214]" : "bg-[#0a3320] text-emerald-200 hover:bg-emerald-800/60"
                  }`}
                >
                  En attente ({requests.filter((r) => r.status === "pending").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("approved")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filter === "approved" ? "bg-amber-400 text-[#062214]" : "bg-[#0a3320] text-emerald-200 hover:bg-emerald-800/60"
                  }`}
                >
                  Autorisés ({requests.filter((r) => r.status === "approved").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("rejected")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filter === "rejected" ? "bg-amber-400 text-[#062214]" : "bg-[#0a3320] text-emerald-200 hover:bg-emerald-800/60"
                  }`}
                >
                  Refusés ({requests.filter((r) => r.status === "rejected").length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshList}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a3320] text-emerald-300 hover:bg-emerald-800"
                  title="Actualiser la liste"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/30"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Déconnexion
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-emerald-400/70">
                  <p className="text-sm">Aucune demande trouvée pour ce filtre.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map((req) => (
                    <div
                      key={req.id}
                      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                        req.status === "approved"
                          ? "border-emerald-600/40 bg-[#082d1c]"
                          : req.status === "rejected"
                          ? "border-red-500/30 bg-red-950/20 opacity-75"
                          : "border-amber-500/40 bg-[#0a3320]"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{req.firstName}</span>
                          {req.status === "pending" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                              <Clock className="h-3 w-3" /> En attente
                            </span>
                          )}
                          {req.status === "approved" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> Autorisé
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-300">
                              <XCircle className="h-3 w-3" /> Refusé
                            </span>
                          )}
                        </div>
                        {req.email && <p className="text-xs text-emerald-200/80">{req.email}</p>}
                        <p className="text-[11px] text-emerald-400/60">
                          ID Appareil : {req.deviceId} · Demandé le {new Date(req.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {req.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => handleAction(req.id, "approved")}
                            className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-emerald-500 px-3.5 text-xs font-bold text-[#062214] shadow hover:bg-emerald-400"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Autoriser
                          </button>
                        )}
                        {req.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => handleAction(req.id, "rejected")}
                            className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-red-500/20 px-3.5 text-xs font-bold text-red-200 hover:bg-red-500/30"
                          >
                            <XCircle className="h-4 w-4" />
                            Refuser
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
