import React from "react";
import { BookOpen, Flag, History, Lock, Smartphone } from "lucide-react";
import ResponsiblePlay from "../components/ResponsiblePlay";

export default function AidePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-4 py-5 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Mode d'emploi</p>
        <h1 className="text-2xl font-black text-white">Comment lire Partants PMU</h1>
        <p className="mt-1 text-sm leading-relaxed text-emerald-100/80">
          L'application affiche le programme, les partants, le pronostic et l'arrivée des courses
          terminées. Elle fonctionne dans l'aperçu, sur le lien publié et dans l'APK. Elle ne prend
          aucun pari.
        </p>
      </header>

      <article className="rounded-3xl border border-emerald-800 bg-[#0b3222] p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <Smartphone className="h-5 w-5" />
          <h2 className="font-bold text-white">Aperçu, lien et APK</h2>
        </div>
        <p className="text-sm leading-relaxed text-emerald-50/90">
          Après une mise à jour, republiez la version en ligne puis réinstallez l'APK. Les onglets
          Programme, Partants, Historique, Favoris, Aide et Admin restent visibles en bas de l'écran.
          Le programme est lu directement, sans écran de connexion.
        </p>
      </article>

      <article className="rounded-3xl border border-emerald-800 bg-[#0b3222] p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <History className="h-5 w-5" />
          <h2 className="font-bold text-white">Historique Quinté</h2>
        </div>
        <p className="text-sm leading-relaxed text-emerald-50/90">
          L'onglet Historique ne lit que les courses de Quinté. Touchez Analyser : chaque pronostic
          affiche le top 8 avec l'arrivée sur 1 mois, 3 mois ou 1 an. Ce n'est pas une promesse de gain.
        </p>
      </article>

      <article className="rounded-3xl border border-emerald-800 bg-[#0b3222] p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <Flag className="h-5 w-5" />
          <h2 className="font-bold text-white">Courses terminées</h2>
        </div>
        <p className="text-sm leading-relaxed text-emerald-50/90">
          Dès qu'une course est terminée, l'arrivée officielle s'affiche : place, numéro, nom du
          cheval et cote.
        </p>
      </article>

      <article className="rounded-3xl border border-emerald-800 bg-[#0b3222] p-4">
        <div className="mb-2 flex items-center gap-2 text-amber-300">
          <Lock className="h-5 w-5" />
          <h2 className="font-bold text-white">Admin</h2>
        </div>
        <p className="text-sm leading-relaxed text-emerald-50/90">
          L'onglet Admin reste protégé par mot de passe. Deux tentatives incorrectes bloquent la
          connexion admin sur cet appareil. Le reste de l'application s'ouvre sans mot de passe.
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
            Chaque jeu proposé reçoit une combinaison : 1 cheval en simple, 2 en couplé ou 2 sur 4, 3
            en trio ou tiercé, 4 en super 4, quarté+ ou multi, 5 en quinté+ ou pick 5.
          </li>
          <li>Les non-partants apparaissent grisés dans la liste.</li>
        </ul>
      </article>

      <ResponsiblePlay />
    </div>
  );
}
