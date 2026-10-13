import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, Clock, Flag, Trophy, X } from "lucide-react";
import {
  getStoredNotifications,
  markAllNotificationsRead,
  requestBrowserNotificationPermission,
  checkFavoriteNotifications,
  AppNotification,
} from "../lib/notifications";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenCourse: (date: string, reunion: number, course: number) => void;
}

export default function NotificationCenter({ isOpen, onClose, onOpenCourse }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>(getStoredNotifications);
  const [browserPerm, setBrowserPerm] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  useEffect(() => {
    if (!isOpen) return;
    setNotifications(getStoredNotifications());
    // Check favorites on open
    checkFavoriteNotifications().then((list) => setNotifications(list));
  }, [isOpen]);

  useEffect(() => {
    // Periodically check notifications every 45 seconds
    const interval = setInterval(() => {
      checkFavoriteNotifications().then((list) => setNotifications(list));
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  async function handleEnableBrowser() {
    const granted = await requestBrowserNotificationPermission();
    setBrowserPerm(granted ? "granted" : "denied");
  }

  function handleMarkRead() {
    const updated = markAllNotificationsRead();
    setNotifications(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm sm:p-4">
      <div className="relative flex h-full w-full max-w-md flex-col bg-[#062214] text-emerald-50 shadow-2xl sm:h-[620px] sm:rounded-3xl sm:border sm:border-amber-500/30">
        <div className="flex items-center justify-between border-b border-emerald-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-[#062214]">
              <Bell className="h-5 w-5 font-black" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Notifications</h2>
              <p className="text-xs text-emerald-200/70">Favoris · Départ & Arrivée</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>

        {browserPerm !== "granted" && browserPerm !== "unsupported" && (
          <div className="m-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
            <p className="font-bold mb-1">Activer les alertes bureau</p>
            <p className="mb-2 text-amber-100/80">Recevez des notifications même lorsque l'application est en arrière-plan.</p>
            <button
              type="button"
              onClick={handleEnableBrowser}
              className="rounded-xl bg-amber-400 px-3 py-1.5 font-bold text-[#062214]"
            >
              Autoriser les notifications
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-2 text-xs text-emerald-300">
          <span>{notifications.filter((n) => !n.read).length} non lue(s)</span>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkRead}
              className="flex items-center gap-1 font-semibold hover:text-amber-300"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-emerald-400/70 px-6">
              <Bell className="h-10 w-10 stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-white">Aucune notification</p>
              <p className="text-xs mt-1">Ajoutez des courses en favoris (icône cœur) pour être alerté du départ imminent et des arrivées.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    onOpenCourse(n.date, n.reunion, n.course);
                    onClose();
                  }}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition-all hover:border-amber-400/50 ${
                    n.read ? "border-emerald-800/60 bg-[#08291b]/70" : "border-amber-500/40 bg-[#0b3624]"
                  }`}
                >
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    n.type === "start" ? "bg-amber-400 text-[#062214]" : "bg-emerald-500 text-[#062214]"
                  }`}>
                    {n.type === "start" ? <Flag className="h-4 w-4 font-black" /> : <Trophy className="h-4 w-4 font-black" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-white text-sm truncate">{n.title}</p>
                      <span className="text-[11px] text-emerald-300/70 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
