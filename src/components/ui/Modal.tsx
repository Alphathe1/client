import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg";
}

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the latest onClose in a ref so inline callbacks don't re-run the effect (and steal focus) on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("input,select,textarea")?.focus(), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
      prev?.focus();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 print:hidden">
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 sm:rounded-3xl ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
          >
            <div className="mb-5 flex items-start justify-between gap-6">
              <div>
                <h2 id="modal-title" className="font-display text-3xl text-text font-medium">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <button onClick={onClose} className="-m-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text" aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
