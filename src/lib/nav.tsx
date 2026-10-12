import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

interface NavValue {
  path: string;
  navigate: (to: string) => void;
}

const NavContext = createContext<NavValue>({
  path: "/",
  navigate: () => {},
});

export function readHashPath(): string {
  try {
    const raw = String(window.location.hash || "");
    const withoutHash = raw.charAt(0) === "#" ? raw.slice(1) : raw;
    const pathOnly = withoutHash.split("?")[0].split("#")[0] || "/";
    if (!pathOnly || pathOnly === "/") return "/";
    return pathOnly.charAt(0) === "/" ? pathOnly : `/${pathOnly}`;
  } catch {
    return "/";
  }
}

export function HashNav({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState(readHashPath);

  useEffect(() => {
    const sync = () => setPath(readHashPath());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const value = useMemo<NavValue>(
    () => ({
      path,
      navigate: (to: string) => {
        const next = String(to || "/");
        const hash = next.charAt(0) === "#" ? next : `#${next.charAt(0) === "/" ? next : `/${next}`}`;
        try {
          if (window.location.hash !== hash) window.location.hash = hash;
          else setPath(readHashPath());
        } catch {
          setPath(next.charAt(0) === "/" ? next : `/${next}`);
        }
      },
    }),
    [path]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  return useContext(NavContext);
}

export function AppRoutes({
  routes,
}: {
  routes: Array<{ path: string; element: React.ReactNode }>;
}) {
  const { path } = useNav();
  const list = Array.isArray(routes) ? routes : [];
  const match = list.find((route) => route.path === path) || list.find((route) => route.path === "*");
  return <>{match?.element || null}</>;
}

export function NavLink({
  to,
  end,
  className,
  children,
}: {
  to: string;
  end?: boolean;
  className?: string | ((active: boolean) => string);
  children: React.ReactNode;
}) {
  const { path, navigate } = useNav();
  const target = String(to || "/");
  const active = end ? path === target : path === target || (target !== "/" && path.startsWith(target));
  const cls = typeof className === "function" ? className(active) : String(className || "");
  return (
    <a
      href={`#${target}`}
      className={cls}
      onClick={(event) => {
        event.preventDefault();
        navigate(target);
      }}
    >
      {children}
    </a>
  );
}
