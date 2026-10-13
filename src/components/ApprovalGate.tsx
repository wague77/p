import React, { useState, useEffect } from "react";
import { Shield, Clock, XCircle, UserCheck, Send, Lock } from "lucide-react";
import { getDeviceId, getMyRequest, submitAccessRequest } from "../lib/approval";
import AdminModal from "./AdminModal";

interface Props {
  children: React.ReactNode;
}

export default function ApprovalGate({ children }: Props) {
  const [deviceId, setDeviceId] = useState("");
  const [request, setRequest] = useState<ReturnType<typeof getMyRequest>>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  const refreshStatus = () => {
    const id = getDeviceId();
    setDeviceId(id);
    const req = getMyRequest(id);
    setRequest(req);
    setChecking(false);
  };

  useEffect(() => {
    refreshStatus();
    // Poll every 4 seconds to check if admin approved
    const interval = setInterval(() => {
      const id = getDeviceId();
      const req = getMyRequest(id);
      setRequest(req);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("Veuillez entrer votre prénom ou nom.");
      return;
    }
    setError("");
    const updated = submitAccessRequest(firstName, email);
    setRequest(updated);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04180f] text-emerald-100">
        <p className="text-sm font-medium animate-pulse">Vérification de l'accès...</p>
      </div>
    );
  }

  const isApproved = request?.status === "approved";

  if (!isApproved) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#04180f] px-4 py-8 text-emerald-50">
        <div className="absolute top-4 right-4">
          <button
            type="button"
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-emerald-800 bg-[#0b3222] px-3.5 py-2 text-xs font-bold text-amber-300 shadow-md hover:bg-emerald-800"
          >
            <Shield className="h-4 w-4" />
            Espace Administrateur
          </button>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#062214] p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#062214] shadow-lg shadow-amber-900/50">
              <Lock className="h-8 w-8 font-black" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Sécurité Wague</p>
            <h1 className="text-2xl font-black text-white mt-1">Approbation requise</h1>
            <p className="text-sm text-emerald-200/80 mt-2">
              L'accès à l'application Partants Wague nécessite une validation par l'administrateur.
            </p>
          </div>

          {!request || request.status === "rejected" ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {request?.status === "rejected" && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                  <span>Votre précédente demande a été refusée par l'administrateur. Vous pouvez recommencer.</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-300">Prénom et Nom *</label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Ex: Marc Lemaire"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="min-h-12 rounded-xl border border-emerald-800 bg-[#0a3320] px-4 text-sm text-white placeholder-emerald-600 outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-300">Email (optionnel)</label>
                <input
                  type="email"
                  maxLength={100}
                  placeholder="Ex: marc@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-12 rounded-xl border border-emerald-800 bg-[#0a3320] px-4 text-sm text-white placeholder-emerald-600 outline-none focus:border-amber-400"
                />
              </div>

              {error && <p className="text-xs font-bold text-red-400">{error}</p>}

              <button
                type="submit"
                className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 text-sm font-black text-[#062214] shadow-lg shadow-amber-900/30 hover:from-amber-300 hover:to-amber-400"
              >
                <Send className="h-4 w-4" />
                Demander l'accès
              </button>
            </form>
          ) : request.status === "pending" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 animate-pulse">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-bold text-white text-base">Bonjour {request.firstName},</p>
                <p className="text-sm text-emerald-200/90 leading-relaxed">
                  Votre demande d'accès est en attente de validation par l'administrateur.
                </p>
                <p className="text-xs text-emerald-400/70 mt-2">
                  Cette page se mettra à jour automatiquement dès l'autorisation.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshStatus}
                className="mt-2 min-h-11 rounded-xl bg-[#0a3320] border border-emerald-800 px-4 text-xs font-bold text-amber-300 hover:bg-emerald-800/60"
              >
                Vérifier le statut
              </button>
            </div>
          ) : null}
        </div>

        <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} onStatusUpdated={refreshStatus} />
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="absolute top-3 right-4 z-40">
          <button
            type="button"
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-800/60 bg-[#062214]/90 px-3 py-1.5 text-xs font-bold text-amber-300 shadow hover:bg-emerald-900"
          >
            <Shield className="h-3.5 w-3.5" />
            Admin
          </button>
        </div>
        {children}
      </div>

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} onStatusUpdated={refreshStatus} />
    </>
  );
}
