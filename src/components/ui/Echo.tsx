import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/** Image reveal: the photo opens downward once, when it first scrolls into view. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // observe the unclipped wrapper: a fully clipped element has nothing to intersect
  const seen = useInView(ref, { once: true, margin: "-60px" });
  return (
    <div ref={ref} className={className}>
      <motion.div
        className="size-full"
        initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
        animate={{ clipPath: seen || reduce ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)" }}
        transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1], delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}
