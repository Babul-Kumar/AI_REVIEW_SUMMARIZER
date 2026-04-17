import { motion } from "framer-motion";
import { useMemo } from "react";
import type { Theme } from "../context/ThemeProvider";

interface BubbleConfig {
  id: number;
  size: number;
  left: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
  blur: number;
}

interface GlowConfig {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const ORBITS = [
  {
    id: 1,
    size: 170,
    duration: 22,
    delay: 0,
    tilt: 20,
    squeeze: 1.2,
    ringColor: "border-cyan-300/20",
    electronColor: "bg-cyan-300",
    glow: "0 0 14px rgba(34,211,238,0.8)",
  },
  {
    id: 2,
    size: 230,
    duration: 27,
    delay: 0.2,
    tilt: -10,
    squeeze: 0.92,
    ringColor: "border-indigo-300/20",
    electronColor: "bg-indigo-300",
    glow: "0 0 14px rgba(129,140,248,0.75)",
  },
  {
    id: 3,
    size: 290,
    duration: 34,
    delay: 0.4,
    tilt: 32,
    squeeze: 1.12,
    ringColor: "border-violet-300/18",
    electronColor: "bg-violet-300",
    glow: "0 0 14px rgba(196,181,253,0.65)",
  },
  {
    id: 4,
    size: 350,
    duration: 40,
    delay: 0.1,
    tilt: -28,
    squeeze: 1.05,
    ringColor: "border-sky-300/15",
    electronColor: "bg-sky-300",
    glow: "0 0 16px rgba(125,211,252,0.55)",
  },
];

export function BackgroundAnimation({ theme }: { theme: Theme }) {
  const bubbles = useMemo<BubbleConfig[]>(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const sizes = [56, 74, 96];
        return {
          id: index,
          size: sizes[index % sizes.length],
          left: randomNumber(5, 96),
          duration: randomNumber(18, 32),
          delay: randomNumber(0, 12),
          drift: randomNumber(-95, 95),
          opacity: randomNumber(0.2, 0.4),
          blur: randomNumber(5, 11),
        };
      }),
    [],
  );

  const glows = useMemo<GlowConfig[]>(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        id: index,
        left: randomNumber(10, 88),
        top: randomNumber(12, 88),
        size: randomNumber(6, 14),
        duration: randomNumber(6, 14),
        delay: randomNumber(0, 4),
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: theme === "light" ? 1 : 0 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      >
        <div className="bg-light-atmosphere absolute inset-0" />
        <div className="absolute inset-0">
          {bubbles.map((bubble) => (
            <motion.div
              key={`bubble-${bubble.id}`}
              className="absolute rounded-full bg-white/80"
              style={{
                width: bubble.size,
                height: bubble.size,
                left: `${bubble.left}%`,
                bottom: `-${bubble.size + 24}px`,
                opacity: bubble.opacity,
                filter: `blur(${bubble.blur}px)`,
                boxShadow: "inset 0 0 18px rgba(255,255,255,0.4)",
              }}
              animate={{
                y: ["0vh", "-120vh"],
                x: [0, bubble.drift, bubble.drift * 0.45, 0],
              }}
              transition={{
                duration: bubble.duration,
                delay: bubble.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0"
        animate={{ opacity: theme === "dark" ? 1 : 0 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      >
        <div className="bg-dark-atmosphere absolute inset-0" />

        <div className="absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 sm:right-2 md:right-8">
          <div className="relative h-full w-full">
            {ORBITS.map((orbit) => (
              <div
                key={`orbit-${orbit.id}`}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: orbit.size,
                  height: orbit.size,
                  marginLeft: -(orbit.size / 2),
                  marginTop: -(orbit.size / 2),
                  transform: `rotate(${orbit.tilt}deg) scaleX(${orbit.squeeze})`,
                }}
              >
                <motion.div
                  className="relative h-full w-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: orbit.duration,
                    delay: orbit.delay,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <div
                    className={`absolute inset-0 rounded-full border ${orbit.ringColor}`}
                  />
                  <motion.span
                    className={`absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${orbit.electronColor}`}
                    style={{ boxShadow: orbit.glow }}
                    animate={{ opacity: [0.25, 0.78, 0.25], scale: [1, 1.25, 1] }}
                    transition={{
                      duration: 4 + orbit.id,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />

        {glows.map((glow) => (
          <motion.span
            key={`glow-${glow.id}`}
            className="absolute rounded-full bg-cyan-200/80"
            style={{
              left: `${glow.left}%`,
              top: `${glow.top}%`,
              width: glow.size,
              height: glow.size,
              boxShadow: "0 0 18px rgba(56,189,248,0.55)",
            }}
            animate={{
              y: [0, -16, 0],
              opacity: [0.12, 0.45, 0.12],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: glow.duration,
              delay: glow.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
