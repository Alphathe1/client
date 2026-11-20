import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { IconButton } from "../components/ui/Button";

type ToastKind = "success" | "error";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-[100] flex flex-col items-end gap-2 sm:left-auto print:hidden">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.15, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-line bg-surface-2 p-4 shadow-pop"
              role={t.kind === "error" ? "alert" : "status"}
            >
              {t.kind === "success" ? (
                <CheckCircle size={22} weight="fill" className="shrink-0 text-success" aria-hidden />
              ) : (
                <WarningCircle size={22} weight="fill" className="shrink-0 text-danger" aria-hidden />
              )}
              <p className="flex-1 text-sm text-text">{t.message}</p>
              <IconButton label="Fermer la notification" onClick={() => dismiss(t.id)} className="-my-2.5 -mr-2.5">
                <X size={16} aria-hidden />
              </IconButton>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
