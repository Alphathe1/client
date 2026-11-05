/* TiltedCard — adapted from React Bits (reactbits.dev): 3D tilt following the pointer */
import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

const SPRING = { damping: 30, stiffness: 100, mass: 2 };

export default function TiltedCard({ children, rotateAmplitude = 10, scaleOnHover = 1.03, className = "" }: { children: ReactNode; rotateAmplitude?: number; scaleOnHover?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), SPRING);
  const rotateY = useSpring(useMotionValue(0), SPRING);
  const scale = useSpring(1, SPRING);

  const onMove = (e: MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const ox = e.clientX - r.left - r.width / 2;
    const oy = e.clientY - r.top - r.height / 2;
    rotateX.set((oy / (r.height / 2)) * -rotateAmplitude);
    rotateY.set((ox / (r.width / 2)) * rotateAmplitude);
  };

  return (
    <div ref={ref} className={`[perspective:900px] ${className}`} onMouseMove={onMove} onMouseEnter={() => !reduce && scale.set(scaleOnHover)} onMouseLeave={() => { rotateX.set(0); rotateY.set(0); scale.set(1); }}>
      <motion.div style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }} className="h-full">
        {children}
      </motion.div>
    </div>
  );
}
