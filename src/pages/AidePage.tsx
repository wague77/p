import React from "react";
import { BookOpen, ShieldCheck, Smartphone } from "lucide-react";
import ResponsiblePlay from "../components/ResponsiblePlay";

export default function AidePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-5 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Mode d'emploi</p>
        <h1 className="text-2xl font-black text-white">Comment lire Partants PMU</h1>
        <p className="mt-1 text-sm leading-relaxed text-emerald-100/80">
          L'application affiche le programme, les partants et le pronostic publiés par le service
          Turfinfo. Elle ne prend aucun pari. L'accès est soumis à une approbation obligatoire.
        </p>
      </header>

      <article className="rounded-3xl border border-emerald-800 bg-[#0b3222] p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="font-bold text-white">Approbation obligatoire</h2>
        </div>
        <p className="text-sm leading-relaxed text-emerald-50/90">
          Au premier lancement, indiquez votre nom et un contact. La demande reste en attente tant
          qu'un responsable ne l'a pas approuvée dans l'onglet Accès. Sans approbation, le programme
          des courses ne s'affiche pas.
        </p>
      </article>

      <article className="rounded-3xl border border-emerald-800 bg-[#0b3222] p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <BookOpen className="h-5 w-5" />
          <h2 className="font-bold text-white">Lecture d'une course</h2>
        </div>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-emerald-50/90">
          <li>Choisissez la date, puis une réunion (R1 · Vincennes…) et une course (C1 · 16:23…).</li>
          <li>La fiche indique le nom, l'heure, la distance, la discipline et le nombre de partants.</li>
          <li>Le bloc Pronostic classe la sélection avec numéro, nom et cote probable.</li>
          <li>
            Chaque jeu proposé reçoit une combinaison construite avec les premiers de cette sélection :
            1 cheval en simple, 2 en couplé ou 2 sur 4, 3 en trio ou tiercé, 4 en super 4, quarté+ ou
            multi, 5 en quinté+ ou pick 5.
          </li>
          <li>Les non-partants apparaissent grisés dans la liste.</li>
        </ul>
      </article>

      <article className="rounded-3xl border border-emerald-800 bg-[#0b3222] p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <Smartphone className="h-5 w-5" />
          <h2 className="font-bold text-white">Sur mobile</h2>
        </div>
        <p className="text-sm leading-relaxed text-emerald-50/90">
          Faites défiler les boutons de réunions et de courses horizontalement. Le cœur enregistre la
          course dans les favoris. La date choisie est mémorisée sur cet appareil.
        </p>
      </article>

      <ResponsiblePlay />
    </div>
  );
}
