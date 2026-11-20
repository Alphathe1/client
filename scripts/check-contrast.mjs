// WCAG 2.1 contrast check for the design tokens declared in src/index.css.
// Reads the variables straight from the stylesheet, so the report cannot drift from the code.
//   node scripts/check-contrast.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(fileURLToPath(new URL("../src/index.css", import.meta.url)), "utf8");

/** custom properties declared in a top-level `selector { … }` block */
function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Bloc « ${selector} » introuvable dans src/index.css`);
  const vars = {};
  for (const [, name, value] of match[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars[name] = value.trim();
  return vars;
}

const hex = (value, name) => {
  const m = /^#([0-9a-f]{6})$/i.exec(value ?? "");
  if (!m) throw new Error(`Token --${name} absent ou non hexadécimal (${value ?? "non défini"})`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
};
const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `fg` at `alpha` painted over `bg` */
const over = (fg, bg, alpha) => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

const SURFACES = ["bg", "surface", "surface-2"];
const TEXTS = ["text", "muted", "subtle", "brand", "success", "warning", "danger", "info"];
const STATES = ["success", "warning", "danger", "info", "brand"];

let failures = 0;
for (const [theme, selector] of [
  ["clair", ":root"],
  ["sombre", ".dark"],
]) {
  const vars = block(selector);
  const c = (name) => hex(vars[name], name);
  console.log(`\n=== thème ${theme} ===`);
  const check = (label, fg, bg, min) => {
    const r = ratio(fg, bg);
    if (r < min) failures++;
    console.log(`${r >= min ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)} (min ${min})  ${label}`);
  };
  for (const s of SURFACES) for (const t of TEXTS) check(`${t} sur ${s}`, c(t), c(s), 4.5);
  check("text sur surface-3", c("text"), c("surface-3"), 4.5);
  check("muted sur surface-3", c("muted"), c("surface-3"), 4.5);
  check("on-brand sur brand-fill", c("on-brand"), c("brand-fill"), 4.5);
  check("on-brand sur brand-fill-hover", c("on-brand"), c("brand-fill-hover"), 4.5);
  check("on-primary sur primary", c("on-primary"), c("primary"), 4.5);
  check("on-primary sur primary-hover", c("on-primary"), c("primary-hover"), 4.5);
  for (const s of STATES) check(`${s} sur son fond à 12 %`, c(s), over(c(s), c("surface"), 0.12), 4.5);
  for (const s of SURFACES) {
    check(`line-strong (contour de contrôle) sur ${s}`, c("line-strong"), c(s), 3);
    check(`anneau de focus (brand) sur ${s}`, c("brand"), c(s), 3);
  }
}

console.log(failures ? `\n${failures} paire(s) sous le seuil.` : "\nToutes les paires passent.");
process.exit(failures ? 1 : 0);
