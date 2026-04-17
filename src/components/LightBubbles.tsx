import { motion } from "framer-motion";
import { useMemo } from "react";

interface BubbleConfig {
  id: number;
  size: number;
  left: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
  colorClass: string;
}

const BUBBLE_COLORS = [
  "from-blue-200 to-cyan-200",
  "from-indigo-200 to-blue-200",
  "from-violet-200 to-cyan-100",
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function LightBubbles() {
  const bubbles = useMemo<BubbleConfig[]>(
    () =>
      Array.from({ length: 15 }, (_, index) => ({
        id: index,
        size: Math.round(randomBetween(40, 120)),
        left: randomBetween(4, 96),
        duration: randomBetween(20, 40),
        delay: randomBetween(0, 14),
        drift: randomBetween(-50, 50),
        opacity: randomBetween(0.15, 0.3),
        colorClass: BUBBLE_COLORS[index % BUBBLE_COLORS.length],
      })),
    [],
  );

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-light-atmosphere" />
      {bubbles.map((bubble) => (
        <motion.div
          key={`bubble-${bubble.id}`}
          className={`absolute bottom-[-140px] rounded-full bg-gradient-to-br blur-2xl ${bubble.colorClass}`}
          style={{
            left: `${bubble.left}%`,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
          }}
          animate={{
            y: ["0vh", "-120vh"],
            x: [0, bubble.drift, bubble.drift * 0.6, 0],
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
  );
}
