export interface ApprovalRequest {
  id: string;
  firstName: string;
  email?: string;
  deviceId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
}

const REQUESTS_KEY = "partants-wague-approval-requests";
const ADMIN_SESSION_KEY = "partants-wague-admin-logged";
const DEVICE_ID_KEY = "partants-wague-device-id";
const ADMIN_FAILS_KEY = "partants-wague-admin-fails";
const ADMIN_LOCKOUT_KEY = "partants-wague-admin-lockout";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = "dev_" + Math.random().toString(36).slice(2, 11) + "_" + Date.now();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "dev_fallback";
  }
}

export function listRequests(): ApprovalRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (!raw) {
      const defaults: ApprovalRequest[] = [
        {
          id: "req_1",
          firstName: "Jean Dupont",
          email: "jean.dupont@example.com",
          deviceId: "dev_demo_1",
          status: "pending",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRequests(reqs: ApprovalRequest[]): void {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs));
  } catch {
    /* ignore */
  }
}

export function getMyRequest(deviceId: string): ApprovalRequest | null {
  const reqs = listRequests();
  return reqs.find((r) => r.deviceId === deviceId) || null;
}

export function submitAccessRequest(firstName: string, email?: string): ApprovalRequest {
  const deviceId = getDeviceId();
  const reqs = listRequests();
  let existing = reqs.find((r) => r.deviceId === deviceId);
  const now = new Date().toISOString();

  if (existing) {
    existing.firstName = firstName.trim();
    existing.email = email ? email.trim() : existing.email;
    existing.status = "pending";
    existing.createdAt = now;
    existing.reviewedAt = undefined;
  } else {
    existing = {
      id: "req_" + Math.random().toString(36).slice(2, 9),
      firstName: firstName.trim(),
      email: email ? email.trim() : undefined,
      deviceId,
      status: "pending",
      createdAt: now,
    };
    reqs.push(existing);
  }
  saveRequests(reqs);
  return existing;
}

export function updateRequestStatus(id: string, status: "approved" | "rejected"): ApprovalRequest[] {
  const reqs = listRequests();
  const updated = reqs.map((r) => {
    if (r.id === id) {
      return {
        ...r,
        status,
        reviewedAt: new Date().toISOString(),
      };
    }
    return r;
  });
  saveRequests(updated);
  return updated;
}

export function isAdminLoggedIn(): boolean {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function getAdminLockoutSeconds(): number {
  try {
    const until = Number(localStorage.getItem(ADMIN_LOCKOUT_KEY) || 0);
    const now = Date.now();
    if (until > now) {
      return Math.ceil((until - now) / 1000);
    }
  } catch {
    /* ignore */
  }
  return 0;
}

export function setAdminLogin(password: string): { success: boolean; locked: boolean; secondsLeft?: number } {
  const lockout = getAdminLockoutSeconds();
  if (lockout > 0) {
    return { success: false, locked: true, secondsLeft: lockout };
  }

  const pwd = password.trim();
  if (pwd === "admin2026" || pwd === "pmu" || pwd === "admin") {
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, "true");
      localStorage.removeItem(ADMIN_FAILS_KEY);
      localStorage.removeItem(ADMIN_LOCKOUT_KEY);
    } catch {
      /* ignore */
    }
    return { success: true, locked: false };
  } else {
    let fails = 0;
    try {
      fails = Number(localStorage.getItem(ADMIN_FAILS_KEY) || 0) + 1;
      localStorage.setItem(ADMIN_FAILS_KEY, String(fails));
      if (fails >= 2) {
        const lockoutUntil = Date.now() + 30000; // 30 seconds lockout after 2 attempts
        localStorage.setItem(ADMIN_LOCKOUT_KEY, String(lockoutUntil));
        return { success: false, locked: true, secondsLeft: 30 };
      }
    } catch {
      /* ignore */
    }
    return { success: false, locked: false, secondsLeft: 2 - fails };
  }
}

export function setAdminLogout(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
