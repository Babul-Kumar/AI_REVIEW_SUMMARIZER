import { motion } from "framer-motion";

const ORBITS = [
  {
    id: "orbit-1",
    size: 220,
    duration: 15,
    tilt: 18,
    particles: [
      { id: "p-1a", size: 10, className: "bg-cyan-300 shadow-[0_0_25px_rgba(100,200,255,0.8)]", angle: 0 },
      { id: "p-1b", size: 10, className: "bg-violet-300 shadow-[0_0_25px_rgba(100,200,255,0.8)]", angle: 180 },
    ],
  },
  {
    id: "orbit-2",
    size: 290,
    duration: 20,
    tilt: -22,
    particles: [
      { id: "p-2a", size: 10, className: "bg-cyan-300 shadow-[0_0_25px_rgba(100,200,255,0.8)]", angle: 0 },
    ],
  },
  {
    id: "orbit-3",
    size: 360,
    duration: 25,
    tilt: 36,
    particles: [
      { id: "p-3a", size: 10, className: "bg-violet-300 shadow-[0_0_25px_rgba(100,200,255,0.8)]", angle: 0 },
      { id: "p-3b", size: 10, className: "bg-cyan-300 shadow-[0_0_25px_rgba(100,200,255,0.8)]", angle: 180 },
    ],
  },
];

export function AtomBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-dark-atmosphere" />

      <div className="pointer-events-none absolute right-0 top-1/2 z-0 h-[520px] w-[520px] translate-y-[-50%] opacity-20 blur-sm">
        {ORBITS.map((orbit) => (
          <div
            key={orbit.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: orbit.size,
              height: orbit.size,
              marginLeft: -(orbit.size / 2),
              marginTop: -(orbit.size / 2),
              transform: `rotate(${orbit.tilt}deg)`,
            }}
          >
            <motion.div
              className="relative h-full w-full"
              animate={{ rotate: 360 }}
              transition={{
                duration: orbit.duration,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <div className="absolute inset-0 rounded-full border border-white/10" />

              {orbit.particles.map((particle) => (
                <div
                  key={particle.id}
                  className="absolute inset-0"
                  style={{ transform: `rotate(${particle.angle}deg)` }}
                >
                  <span
                    className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full ${particle.className}`}
                    style={{
                      width: particle.size,
                      height: particle.size,
                    }}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
