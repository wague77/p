import { useEffect, useState } from "react";

export type ThemeMode = "system" | "dark" | "light";

const THEME_KEY = "partants-wague-theme-mode";

export function getStoredTheme(): ThemeMode {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light" || t === "system") return t;
  } catch {
    /* ignore */
  }
  return "system";
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
}

export function getEffectiveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "dark" || mode === "light") return mode;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(mode: ThemeMode) {
  const effective = getEffectiveTheme(mode);
  const root = document.documentElement;
  if (effective === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    setThemeMode(mode);
  };

  return { theme, setTheme };
}
