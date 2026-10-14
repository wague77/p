import React from "react";
import { Flag, Heart, History, Info, ListOrdered, Lock } from "lucide-react";
import { NavLink } from "../lib/nav";

const links = [
  { to: "/", label: "Programme", icon: Flag, end: true },
  { to: "/partants", label: "Partants", icon: ListOrdered, end: false },
  { to: "/historique", label: "Historique", icon: History, end: false },
  { to: "/favoris", label: "Favoris", icon: Heart, end: false },
  { to: "/aide", label: "Aide", icon: Info, end: false },
  { to: "/admin", label: "Admin", icon: Lock, end: false },
];

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-500/30 bg-[#04180f] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 py-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={(isActive) =>
                `flex min-h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-bold ${
                  isActive ? "bg-amber-400 text-[#062214]" : "text-emerald-50"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
