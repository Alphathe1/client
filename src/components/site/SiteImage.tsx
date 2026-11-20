import { useState, type ImgHTMLAttributes } from "react";
import { API_BASE } from "../../lib/api";
import { mediaSrc } from "../../lib/site/links";

type SiteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  /** an image value of the content: "", /site/media/<id>, https://… or /images/… */
  src: string;
  /** "" by default: the content has no alt text, its photos illustrate the text next to them */
  alt?: string;
};

/** Owner-chosen image: uploads come from the API; nothing is rendered when the value is empty, invalid or fails to load */
export function SiteImage({ src, alt = "", loading = "lazy", ...rest }: SiteImageProps) {
  const resolved = mediaSrc(src, API_BASE);
  const [failed, setFailed] = useState<string | null>(null);
  if (!resolved || failed === resolved) return null;
  return <img src={resolved} alt={alt} loading={loading} decoding="async" onError={() => setFailed(resolved)} {...rest} />;
}
