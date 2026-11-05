/* SplitText — adapted from React Bits (reactbits.dev), animated with GSAP */
import { useEffect, useRef, type ElementType } from "react";
import { gsap } from "gsap";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number; // ms between letters
  duration?: number;
  as?: ElementType;
  charClassName?: string;
}

export default function SplitText({ text, className = "", delay = 40, duration = 0.8, as: Tag = "span", charClassName = "" }: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = el.querySelectorAll<HTMLElement>("[data-char]");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        { opacity: 0, yPercent: 60, rotateX: -70 },
        { opacity: 1, yPercent: 0, rotateX: 0, duration, ease: "power3.out", stagger: delay / 1000 },
      );
    }, el);
    return () => ctx.revert();
  }, [text, delay, duration]);

  const words = text.split(" ");
  return (
    <Tag ref={ref} className={`perspective-[600px] ${className}`} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {Array.from(word).map((ch, ci) => (
            <span key={ci} data-char className={`inline-block will-change-transform ${charClassName}`}>
              {ch}
            </span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}
