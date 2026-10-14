import React from "react";
import { Flag, Heart, Info, ListOrdered, ShieldCheck } from "lucide-react";
import { NavLink } from "../lib/nav";

const links = [
  { to: "/", label: "Programme", icon: Flag, end: true },
  { to: "/partants", label: "Partants", icon: ListOrdered, end: false },
  { to: "/favoris", label: "Favoris", icon: Heart, end: false },
  { to: "/approbations", label: "Accès", icon: ShieldCheck, end: false },
  { to: "/aide", label: "Aide", icon: Info, end: false },
];

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-500/20 bg-[#04180f]/95 backdrop-blur-md">
      <div className="mx-auto grid max-w-5xl grid-cols-5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={(isActive) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  isActive ? "text-amber-300" : "text-emerald-200/70"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
