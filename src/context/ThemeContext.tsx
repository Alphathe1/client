import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

type Theme = "light" | "dark";
const KEY = "lempire_theme";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html already applied the initial class before paint
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Read a resolved CSS color token (for chart libraries that need literal values) */
export function useToken(name: string) {
  const { theme } = useTheme();
  void theme; // re-read when the theme flips
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={`flex size-10 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors duration-100 ease-out hover:bg-surface-2 hover:text-text pointer-coarse:size-11 ${className}`}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {theme === "dark" ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
    </button>
  );
}
