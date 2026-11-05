/* ScrollVelocity — adapted from React Bits (reactbits.dev): marquee that speeds up with scroll */
import { useRef, type ReactNode } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "motion/react";

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

export default function ScrollVelocity({ children, baseVelocity = 3, className = "" }: { children: ReactNode; baseVelocity?: number; className?: string }) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [0, 1000], [0, 5], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);
  const dir = useRef(1);

  useAnimationFrame((_t, delta) => {
    if (reduce) return;
    let move = dir.current * baseVelocity * (delta / 1000);
    const f = factor.get();
    if (f < 0) dir.current = -1;
    else if (f > 0) dir.current = 1;
    move += dir.current * move * Math.abs(f);
    baseX.set(baseX.get() - move);
  });

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`} aria-hidden>
      <motion.div className="flex w-max" style={{ x }}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0">{children}</div>
      </motion.div>
    </div>
  );
}
