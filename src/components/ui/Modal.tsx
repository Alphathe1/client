import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { IconButton } from "./Button";
import { useFocusTrap } from "../../lib/useFocusTrap";
import { EASE_SWIFT } from "../../lib/motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg";
}

/** Dialog: a sheet from the bottom on phones, centred from `sm` up. Focus stays inside until it closes. */
export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 print:hidden">
          <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} onClick={onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12, ease: "easeIn" } }}
            transition={{ duration: 0.24, ease: EASE_SWIFT }}
            className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-lg border border-line bg-surface p-5 text-sm shadow-pop outline-none sm:rounded-lg sm:p-6 ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl font-semibold text-text">
                  {title}
                </h2>
                {description && <p id={descId} className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <IconButton label="Fermer" onClick={onClose} className="-mt-1.5 -mr-1.5">
                <X size={18} aria-hidden />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
