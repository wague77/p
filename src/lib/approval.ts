import type { DbRow } from "./db";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AccessRequest {
  name: string;
  contact: string;
  message: string;
  deviceId: string;
  status: ApprovalStatus;
  createdAt: string;
}

const COLLECTION = "approbations";
const DEVICE_KEY = "partants-pmu-device";
const LOCAL_KEY = "partants-pmu-approbations";

function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return String(existing);
    const created = "app-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 1e6));
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return "app-session";
  }
}

export function currentDeviceId(): string {
  return deviceId();
}

function readLocal(): DbRow<AccessRequest>[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DbRow<AccessRequest>[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: DbRow<AccessRequest>[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch {
    /* stockage local indisponible */
  }
}

function dbOrNull() {
  const db = window.nova?.db;
  if (!db || typeof db.list !== "function" || typeof db.insert !== "function" || typeof db.update !== "function") {
    return null;
  }
  return db;
}

function asRequest(row: DbRow<AccessRequest> | null | undefined): AccessRequest | null {
  const data = row?.data;
  if (!data || typeof data !== "object") return null;
  const status = String(data.status ?? "pending");
  const safeStatus: ApprovalStatus =
    status === "approved" || status === "rejected" ? status : "pending";
  return {
    name: String(data.name ?? ""),
    contact: String(data.contact ?? ""),
    message: String(data.message ?? ""),
    deviceId: String(data.deviceId ?? ""),
    status: safeStatus,
    createdAt: String(data.createdAt ?? row?.created_at ?? ""),
  };
}

export async function listRequests(): Promise<DbRow<AccessRequest>[]> {
  const db = dbOrNull();
  if (!db) return readLocal();
  try {
    const rows = await db.list(COLLECTION);
    return Array.isArray(rows) ? (rows as DbRow<AccessRequest>[]) : [];
  } catch {
    return readLocal();
  }
}

export async function findOwnRequest(): Promise<DbRow<AccessRequest> | null> {
  const id = deviceId();
  const rows = await listRequests();
  const found = rows.find((row) => String(row?.data?.deviceId ?? "") === id);
  return found || null;
}

export async function submitRequest(input: {
  name: string;
  contact: string;
  message: string;
}): Promise<DbRow<AccessRequest>> {
  const name = String(input?.name ?? "").trim();
  const contact = String(input?.contact ?? "").trim();
  const message = String(input?.message ?? "").trim();
  if (name.length < 2) throw new Error("Indiquez votre nom (2 caractères minimum).");
  if (contact.length < 3) throw new Error("Indiquez un e-mail ou un téléphone.");
  const payload: AccessRequest = {
    name,
    contact,
    message,
    deviceId: deviceId(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const existing = await findOwnRequest();
  if (existing?.id && existing.data?.status === "approved") return existing;
  const db = dbOrNull();
  if (db && existing?.id && String(existing.id).indexOf("local-") !== 0) {
    try {
      const updated = await db.update(COLLECTION, String(existing.id), payload);
      return updated as DbRow<AccessRequest>;
    } catch {
      /* repli plus bas */
    }
  }
  if (db && !existing) {
    try {
      const row = await db.insert(COLLECTION, payload);
      return row as DbRow<AccessRequest>;
    } catch {
      /* repli local */
    }
  }
  const row: DbRow<AccessRequest> = existing?.id
    ? { ...existing, data: payload }
    : { id: "local-" + String(Date.now()), data: payload, created_at: payload.createdAt };
  const next = readLocal().filter((item) => String(item?.data?.deviceId ?? "") !== payload.deviceId);
  next.push(row);
  writeLocal(next);
  return row;
}

export async function setRequestStatus(id: string, status: ApprovalStatus): Promise<void> {
  const safeId = String(id ?? "");
  const rows = await listRequests();
  const found = rows.find((row) => String(row?.id ?? "") === safeId);
  if (!found) throw new Error("Demande introuvable.");
  const data = asRequest(found);
  if (!data) throw new Error("Demande illisible.");
  const nextData: AccessRequest = { ...data, status };
  const db = dbOrNull();
  if (db && safeId.indexOf("local-") !== 0) {
    try {
      await db.update(COLLECTION, safeId, nextData);
      return;
    } catch {
      /* repli local */
    }
  }
  const local = readLocal().map((row) =>
    String(row?.id ?? "") === safeId ? { ...row, data: nextData } : row
  );
  if (!local.some((row) => String(row?.id ?? "") === safeId)) {
    local.push({ ...found, data: nextData });
  }
  writeLocal(local);
}

export function statusLabel(status: string | undefined): string {
  if (status === "approved") return "Approuvée";
  if (status === "rejected") return "Refusée";
  return "En attente";
}
