import React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingBlock({ label = "Chargement du programme PMU…" }: { label?: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-800/80 bg-[#0a3320]/70 px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
      <p className="text-sm text-emerald-100">{String(label ?? "")}</p>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-400/40 bg-red-950/40 px-4 py-6 text-center">
      <AlertTriangle className="h-8 w-8 text-red-300" />
      <p className="max-w-md text-sm leading-relaxed text-red-100">
        {String(message ?? "Une erreur est survenue.")}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-bold text-[#062214]"
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-700 bg-[#0a3320]/40 px-4 py-8 text-center">
      <Inbox className="h-8 w-8 text-emerald-300/80" />
      <p className="max-w-md text-sm leading-relaxed text-emerald-100">{String(message ?? "")}</p>
    </div>
  );
}
