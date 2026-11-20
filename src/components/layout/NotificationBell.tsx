import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRinging, CalendarCheck, CalendarX, ChatCircleText, ClockCountdown, PencilSimple } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import type { Notification } from "../../lib/types";

const ICONS: Record<Notification["type"], typeof Bell> = {
  booking_confirmed: CalendarCheck,
  new_appointment: BellRinging,
  reminder: ClockCountdown,
  cancelled: CalendarX,
  modified: PencilSimple,
  review: ChatCircleText,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = () =>
    api
      .get<{ items: Notification[]; unread: number }>("/notifications")
      .then((d) => {
        setItems(d.items);
        setUnread(d.unread);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = async (n: Notification) => {
    if (!n.read) {
      await api.patch(`/notifications/${n._id}/read`).catch(() => {});
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await api.patch("/notifications/read-all").catch(() => {});
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-10 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors duration-100 ease-out hover:bg-surface-2 hover:text-text pointer-coarse:size-11"
        aria-label={unread ? `Notifications, ${unread} non lues` : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-fill px-1 font-mono text-xs font-medium text-on-brand">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-md border border-line bg-surface shadow-pop"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-semibold">Notifications</p>
              {unread > 0 && (
                <button type="button" onClick={readAll} className="min-h-9 cursor-pointer rounded-xs text-xs font-medium text-muted underline-offset-4 hover:text-text hover:underline pointer-coarse:min-h-11">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Aucune notification pour le moment.</li>}
              {items.map((n) => {
                const Icon = ICONS[n.type];
                return (
                  <li key={n._id}>
                    <button type="button" onClick={() => openItem(n)} className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${n.read ? "" : "bg-surface-2/60"}`}>
                      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${n.read ? "bg-surface-2 text-muted" : "bg-surface-3 text-text"}`}>
                        <Icon size={18} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-text">
                          {n.title}
                          {!n.read && (
                            <>
                              <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-fill" />
                              <span className="sr-only">, non lue</span>
                            </>
                          )}
                        </span>
                        <span className="block text-sm break-words text-muted">{n.message}</span>
                        <span className="mt-0.5 block text-xs text-subtle">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
