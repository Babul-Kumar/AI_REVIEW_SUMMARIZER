import { motion } from "framer-motion";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "../context/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 text-xs font-semibold tracking-wide text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-all duration-300 hover:scale-105 hover:border-sky-300 hover:text-sky-700 dark:border-white/15 dark:bg-slate-900/70 dark:text-slate-200 dark:shadow-[0_0_24px_rgba(56,189,248,0.2)] dark:hover:border-cyan-300/60 dark:hover:text-cyan-200"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <motion.span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900 dark:from-cyan-400/25 dark:to-violet-500/35 dark:text-cyan-200"
        animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        {isDark ? <MoonStar className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}
      </motion.span>
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
