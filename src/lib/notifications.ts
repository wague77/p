import { listFavorites, FavoriteCourse } from "./db";
import { fetchProgramme, fetchParticipants, parseInputDate } from "./pmu";
import type { Participant } from "./types";

export interface AppNotification {
  id: string;
  type: "start" | "arrival";
  title: string;
  message: string;
  time: string;
  read: boolean;
  date: string;
  reunion: number;
  course: number;
}

const NOTIFICATIONS_KEY = "partants-wague-notifications";
const NOTIFIED_KEYS_STORAGE = "partants-wague-notified-events";

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifs: AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function markAllNotificationsRead(): AppNotification[] {
  const notifs = getStoredNotifications().map((n) => ({ ...n, read: true }));
  saveNotifications(notifs);
  return notifs;
}

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEYS_STORAGE);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function addNotifiedKey(key: string): void {
  try {
    const set = getNotifiedSet();
    set.add(key);
    localStorage.setItem(NOTIFIED_KEYS_STORAGE, JSON.stringify(Array.from(set).slice(-100)));
  } catch {
    /* ignore */
  }
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const res = await Notification.requestPermission();
    return res === "granted";
  }
  return false;
}

function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    } catch {
      /* ignore */
    }
  }
}

export async function checkFavoriteNotifications(): Promise<AppNotification[]> {
  const favorites = await listFavorites();
  if (!favorites.length) return getStoredNotifications();

  const now = new Date();
  const notifs = getStoredNotifications();
  const notifiedSet = getNotifiedSet();
  let updated = false;

  for (const fav of favorites) {
    const favData = fav?.data;
    if (!favData || !favData.date) continue;

    const dateObj = parseInputDate(favData.date);
    // Only check today's or recent favorites
    const diffDays = Math.abs(now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 1) continue;

    try {
      const reunions = await fetchProgramme(dateObj);
      const reunion = reunions.find((r) => Number(r?.numOfficiel) === Number(favData.reunion));
      if (!reunion || !reunion.courses) continue;

      const course = reunion.courses.find((c) => Number(c?.numOrdre) === Number(favData.course));
      if (!course) continue;

      // 1. Check start imminent (within 5 minutes)
      const heureDepart = course.heureDepart;
      if (typeof heureDepart === "number" || typeof heureDepart === "string") {
        let departDate: Date | null = null;
        if (typeof heureDepart === "number" && heureDepart > 1e11) {
          departDate = new Date(heureDepart);
        } else {
          // Parse time string e.g. "15:30" or timestamp
          const text = String(heureDepart);
          const parts = text.includes(":") ? text.split(":") : null;
          if (parts && parts.length >= 2) {
            departDate = new Date(dateObj);
            departDate.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
          } else {
            const n = Number(heureDepart);
            if (n >= 10000 && n < 240000) {
              const hh = Math.floor(n / 10000);
              const mm = Math.floor((n % 10000) / 100);
              departDate = new Date(dateObj);
              departDate.setHours(hh, mm, 0, 0);
            }
          }
        }

        if (departDate && !isNaN(departDate.getTime())) {
          const diffMin = (departDate.getTime() - now.getTime()) / (1000 * 60);
          // If starting in 0 to 6 minutes and not yet started long ago
          if (diffMin >= -5 && diffMin <= 6) {
            const startKey = `start_${favData.date}_R${favData.reunion}_C${favData.course}`;
            if (!notifiedSet.has(startKey)) {
              const title = `Départ imminent : R${favData.reunion} C${favData.course}`;
              const message = `${favData.hippodrome} — ${favData.libelle} à ${favData.heure}. Préparez vos jeux !`;
              notifs.unshift({
                id: "notif_" + Math.random().toString(36).slice(2, 9),
                type: "start",
                title,
                message,
                time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                read: false,
                date: favData.date,
                reunion: favData.reunion,
                course: favData.course,
              });
              addNotifiedKey(startKey);
              sendBrowserNotification(title, message);
              updated = true;
            }
          }
        }
      }

      // 2. Check arrival / results
      const participants = await fetchParticipants(dateObj, favData.reunion, favData.course).catch(() => [] as Participant[]);
      const arrived = participants.filter((p) => typeof p?.ordreArrivee === "number" && p.ordreArrivee > 0);
      const isFinished = String(course?.statut ?? "").toUpperCase().includes("ARRIVEE") || arrived.length > 0;

      if (isFinished && arrived.length > 0) {
        const arrivalKey = `arrival_${favData.date}_R${favData.reunion}_C${favData.course}`;
        if (!notifiedSet.has(arrivalKey)) {
          arrived.sort((a, b) => (a.ordreArrivee || 99) - (b.ordreArrivee || 99));
          const top3 = arrived.slice(0, 3).map((p) => `${p.ordreArrivee}. N°${p.numPmu} ${p.nom}`).join(" · ");
          const title = `Arrivée connue : R${favData.reunion} C${favData.course}`;
          const message = `${favData.hippodrome} — ${favData.libelle}. Top arrivée : ${top3}`;
          notifs.unshift({
            id: "notif_" + Math.random().toString(36).slice(2, 9),
            type: "arrival",
            title,
            message,
            time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            read: false,
            date: favData.date,
            reunion: favData.reunion,
            course: favData.course,
          });
          addNotifiedKey(arrivalKey);
          sendBrowserNotification(title, message);
          updated = true;
        }
      }
    } catch {
      /* ignore individual favorite fetch error */
    }
  }

  if (updated) {
    saveNotifications(notifs);
  }
  return notifs;
}

export function getUnreadNotificationCount(): number {
  return getStoredNotifications().filter((n) => !n.read).length;
}

