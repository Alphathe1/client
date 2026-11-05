/* BlurText — adapted from React Bits (reactbits.dev), word-by-word blur reveal */
import { motion, useReducedMotion } from "motion/react";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number; // ms between words
  direction?: "top" | "bottom";
}

export default function BlurText({ text, className = "", delay = 80, direction = "top" }: BlurTextProps) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const y = direction === "top" ? -14 : 14;
  return (
    <p className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block will-change-[transform,filter,opacity]"
          initial={reduce ? false : { filter: "blur(10px)", opacity: 0, y }}
          whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.5, delay: (i * delay) / 1000, ease: [0.23, 1, 0.32, 1] }}
        >
          {w}
          {i < words.length - 1 && " "}
        </motion.span>
      ))}
    </p>
  );
}
