/* AnimatedContent — adapted from React Bits (reactbits.dev): reveal on scroll */
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface AnimatedContentProps {
  children: ReactNode;
  distance?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  delay?: number;
  scale?: number;
  className?: string;
}

export default function AnimatedContent({ children, distance = 40, direction = "vertical", reverse = false, delay = 0, scale = 1, className = "" }: AnimatedContentProps) {
  const reduce = useReducedMotion();
  const offset = reverse ? -distance : distance;
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, scale, x: direction === "horizontal" ? offset : 0, y: direction === "vertical" ? offset : 0 }}
      whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 90, damping: 20, delay }}
    >
      {children}
    </motion.div>
  );
}
