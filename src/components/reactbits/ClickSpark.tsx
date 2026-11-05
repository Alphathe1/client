/* ClickSpark — adapted from React Bits (reactbits.dev): gold sparks on every click */
import { useCallback, useEffect, useRef, type ReactNode } from "react";

interface Spark {
  x: number;
  y: number;
  angle: number;
  start: number;
}

export default function ClickSpark({
  children,
  sparkColor = "#f5c518",
  sparkSize = 10,
  sparkRadius = 18,
  sparkCount = 8,
  duration = 420,
}: {
  children: ReactNode;
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparks.current = sparks.current.filter((s) => {
        const p = (t - s.start) / duration;
        if (p >= 1) return false;
        const eased = p * (2 - p);
        const dist = eased * sparkRadius;
        const len = sparkSize * (1 - eased);
        const x1 = s.x + dist * Math.cos(s.angle);
        const y1 = s.y + dist * Math.sin(s.angle);
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + len * Math.cos(s.angle), y1 + len * Math.sin(s.angle));
        ctx.stroke();
        return true;
      });
      if (sparks.current.length) raf.current = requestAnimationFrame(draw);
    },
    [duration, sparkColor, sparkRadius, sparkSize],
  );

  const onClick = (e: React.MouseEvent) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    for (let i = 0; i < sparkCount; i++) {
      sparks.current.push({ x: e.clientX, y: e.clientY, angle: (2 * Math.PI * i) / sparkCount, start: now });
    }
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
  };

  return (
    <div onClickCapture={onClick} className="relative">
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[200] h-screen w-screen print:hidden" />
      {children}
    </div>
  );
}
