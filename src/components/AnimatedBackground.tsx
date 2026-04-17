import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../context/ThemeProvider";
import { AtomBackground } from "./AtomBackground";
import { LightBubbles } from "./LightBubbles";

export function AnimatedBackground() {
  const { theme } = useTheme();

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {theme === "dark" ? (
          <motion.div
            key="dark-background"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <AtomBackground />
          </motion.div>
        ) : (
          <motion.div
            key="light-background"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <LightBubbles />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
