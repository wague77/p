import React, { useEffect, useState } from "react";
import { Clock3, ShieldCheck, ShieldX } from "lucide-react";
import { findOwnRequest, statusLabel, submitRequest, type AccessRequest } from "../lib/approval";
import type { DbRow } from "../lib/db";
import NavBar from "./NavBar";

interface Props {
  children: React.ReactNode;
}

export default function ApprovalGate({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<DbRow<AccessRequest> | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const found = await findOwnRequest();
      setRow(found);
      if (found?.data) {
        setName(String(found.data.name ?? ""));
        setContact(String(found.data.contact ?? ""));
        setMessage(String(found.data.message ?? ""));
      }
    } catch (err) {
      setError(err instanceof Error ? String(err.message ?? "") : "Vérification impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const status = String(row?.data?.status ?? "");
  if (!loading && status === "approved") return <>{children}</>;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await submitRequest({ name, contact, message });
      setRow(saved);
    } catch (err) {
      setError(err instanceof Error ? String(err.message ?? "") : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#04180f] text-emerald-50">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-8 pb-28">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-[#062214]">
            P
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">Accès contrôlé</p>
            <h1 className="text-2xl font-black text-white">Approbation obligatoire</h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-emerald-100/85">
          Partants PMU n'est pas ouvert sans accord. Envoyez une demande : l'application reste fermée
          tant qu'un admin ne l'a pas approuvée. L'onglet Admin reste accessible en bas.
        </p>

        {loading ? (
          <p className="rounded-2xl border border-emerald-800 bg-[#0b3222] px-4 py-6 text-center text-sm">
            Vérification de votre accès…
          </p>
        ) : null}

        {!loading && status === "pending" ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-400/10 px-4 py-4 text-sm text-amber-50">
            <p className="flex items-center gap-2 font-bold">
              <Clock3 className="h-4 w-4" /> Demande {statusLabel("pending").toLowerCase()}
            </p>
            <p className="mt-2 leading-relaxed">
              {String(row?.data?.name || "Votre demande")} est enregistrée. Revenez après validation, ou
              touchez Actualiser.
            </p>
          </div>
        ) : null}

        {!loading && status === "rejected" ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-950/40 px-4 py-4 text-sm text-red-100">
            <p className="flex items-center gap-2 font-bold">
              <ShieldX className="h-4 w-4" /> Demande refusée
            </p>
            <p className="mt-2">Vous pouvez renvoyer une demande corrigée.</p>
          </div>
        ) : null}

        {!loading && status !== "pending" ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-emerald-800 bg-[#0b3222] p-4">
            <label className="flex flex-col gap-1 text-sm">
              Nom
              <input
                required
                value={name}
                onChange={(e) => setName(String(e.target.value ?? ""))}
                className="min-h-11 rounded-xl border border-emerald-800 bg-[#062214] px-3 text-emerald-50 outline-none"
                placeholder="Votre nom"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              E-mail ou téléphone
              <input
                required
                value={contact}
                onChange={(e) => setContact(String(e.target.value ?? ""))}
                className="min-h-11 rounded-xl border border-emerald-800 bg-[#062214] px-3 text-emerald-50 outline-none"
                placeholder="contact@exemple.fr"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Motif
              <textarea
                value={message}
                onChange={(e) => setMessage(String(e.target.value ?? ""))}
                className="min-h-24 rounded-xl border border-emerald-800 bg-[#062214] px-3 py-2 text-emerald-50 outline-none"
                placeholder="Pourquoi souhaitez-vous accéder à l'application ?"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-amber-400 text-sm font-bold text-[#062214] disabled:opacity-60"
            >
              {busy ? "Envoi…" : "Demander l'accès"}
            </button>
          </form>
        ) : null}

        {error ? <p className="text-sm text-red-200">{error}</p> : null}

        <button
          type="button"
          onClick={refresh}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-400/40 text-sm font-semibold text-amber-200"
        >
          <ShieldCheck className="h-4 w-4" /> Actualiser le statut
        </button>
      </div>
      <NavBar />
    </div>
  );
}
