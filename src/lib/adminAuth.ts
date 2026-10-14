const FAIL_KEY = "partants-pmu-admin-fails";
const LOCK_KEY = "partants-pmu-admin-locked";
const SESSION_KEY = "partants-pmu-admin-session";
export const MAX_ADMIN_ATTEMPTS = 2;
const ADMIN_PASSWORD = "674443407Sp@&&&";

function readNumber(key: string): number {
  try {
    const n = Number(localStorage.getItem(key) || "0");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function isAdminLocked(): boolean {
  try {
    return localStorage.getItem(LOCK_KEY) === "1" || readNumber(FAIL_KEY) >= MAX_ADMIN_ATTEMPTS;
  } catch {
    return false;
  }
}

export function failedAttempts(): number {
  if (isAdminLocked()) return MAX_ADMIN_ATTEMPTS;
  return readNumber(FAIL_KEY);
}

export function remainingAttempts(): number {
  return Math.max(0, MAX_ADMIN_ATTEMPTS - failedAttempts());
}

export function isAdminSession(): boolean {
  if (isAdminLocked()) return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "ok";
  } catch {
    return false;
  }
}

export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* session déjà fermée */
  }
}

export function tryAdminLogin(password: string): { ok: boolean; locked: boolean; remaining: number; message: string } {
  if (isAdminLocked()) {
    return {
      ok: false,
      locked: true,
      remaining: 0,
      message: "Accès admin bloqué sur cet appareil après deux tentatives incorrectes.",
    };
  }
  const value = String(password ?? "");
  if (value.length < 1) {
    return { ok: false, locked: false, remaining: remainingAttempts(), message: "Saisissez le mot de passe admin." };
  }
  if (value === ADMIN_PASSWORD) {
    try {
      localStorage.setItem(FAIL_KEY, "0");
      sessionStorage.setItem(SESSION_KEY, "ok");
    } catch {
      /* la session peut échouer si le stockage est bloqué */
    }
    return { ok: true, locked: false, remaining: MAX_ADMIN_ATTEMPTS, message: "" };
  }
  const next = failedAttempts() + 1;
  try {
    localStorage.setItem(FAIL_KEY, String(next));
    if (next >= MAX_ADMIN_ATTEMPTS) localStorage.setItem(LOCK_KEY, "1");
  } catch {
    /* le compteur reste en mémoire de page si le stockage est indisponible */
  }
  const locked = next >= MAX_ADMIN_ATTEMPTS || isAdminLocked();
  return {
    ok: false,
    locked,
    remaining: Math.max(0, MAX_ADMIN_ATTEMPTS - next),
    message: locked
      ? "Deuxième tentative incorrecte. L'accès admin est bloqué sur cet appareil."
      : "Mot de passe incorrect. Il vous reste 1 tentative avant le blocage.",
  };
}
