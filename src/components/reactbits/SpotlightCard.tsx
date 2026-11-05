/* Card with an editorial hover: the frame tightens to the ink color and the content nudges up.
   (Formerly the React Bits SpotlightCard; the radial glow was dropped for the print aesthetic.) */
import type { ReactNode } from "react";

export default function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`group/spot relative border border-line bg-surface transition-colors duration-200 hover:border-text ${className}`}>
      <span aria-hidden className="absolute top-0 left-0 h-1 w-0 bg-gold transition-[width] duration-300 ease-out group-hover/spot:w-full" />
      {children}
    </div>
  );
}
