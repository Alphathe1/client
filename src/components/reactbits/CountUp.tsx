/* CountUp — adapted from React Bits (reactbits.dev), spring-driven number */
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  format?: (n: number) => string;
}

/** The animated digits are hidden from assistive tech, which reads the final value once instead of every frame. */
export default function CountUp({ to, from = 0, duration = 1.6, decimals = 0, prefix = "", suffix = "", className = "", format }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? to : from);
  const spring = useSpring(motionValue, { damping: 20 + 40 * (1 / duration), stiffness: 100 * (1 / duration) });
  const inView = useInView(ref, { once: true, margin: "0px" });

  const render = (n: number) => (format ? format(n) : `${prefix}${n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);

  useEffect(() => {
    if (inView) motionValue.set(to);
  }, [inView, to, motionValue]);

  useEffect(
    () =>
      spring.on("change", (v) => {
        if (ref.current) ref.current.textContent = render(v);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spring, decimals, prefix, suffix, format],
  );

  return (
    <span className={`tabular-nums lining-nums ${className}`}>
      <span ref={ref} aria-hidden>
        {render(reduce ? to : from)}
      </span>
      <span className="sr-only">{render(to)}</span>
    </span>
  );
}
