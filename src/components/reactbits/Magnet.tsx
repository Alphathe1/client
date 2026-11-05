/* Magnet — adapted from React Bits (reactbits.dev): children drift toward the pointer */
import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

export default function Magnet({ children, strength = 4, padding = 60, className = "" }: { children: ReactNode; strength?: number; padding?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();

  const onMove = (e: MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const inside = Math.abs(dx) < r.width / 2 + padding && Math.abs(dy) < r.height / 2 + padding;
    setPos(inside ? { x: dx / strength, y: dy / strength } : { x: 0, y: 0 });
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => setPos({ x: 0, y: 0 })} className={`inline-block ${className}`}>
      <motion.div animate={pos} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
        {children}
      </motion.div>
    </div>
  );
}
