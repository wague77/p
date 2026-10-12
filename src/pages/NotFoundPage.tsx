import React from "react";
import { useNav } from "../lib/nav";

export default function NotFoundPage() {
  const { navigate } = useNav();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-black text-amber-300">404</p>
      <h1 className="text-2xl font-bold text-white">Cette page n'existe pas</h1>
      <p className="text-sm text-emerald-100/80">
        Le parcours demandé est introuvable. Revenez au programme des courses.
      </p>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="inline-flex min-h-11 items-center rounded-xl bg-amber-400 px-5 text-sm font-bold text-[#062214]"
      >
        Retour au programme
      </button>
    </div>
  );
}
