import React from "react";
import { ShieldAlert } from "lucide-react";

export default function ResponsiblePlay() {
  return (
    <aside className="rounded-2xl border border-amber-500/30 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
      <p className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <span>
          Jouer comporte des risques : endettement, dépendance… Appelez le 09 74 75 13 13 (appel non
          surtaxé).
        </span>
      </p>
    </aside>
  );
}
