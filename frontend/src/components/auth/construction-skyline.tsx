"use client";

import { motion } from "framer-motion";

export function ConstructionSkyline() {
  return (
    <svg viewBox="0 0 500 300" className="absolute inset-x-0 bottom-0 h-64 w-full opacity-90 motion-reduce:[&_*]:!animate-none">
      {/* Edificios */}
      <rect x="20" y="140" width="60" height="160" fill="#13203a" />
      <rect x="90" y="90" width="70" height="210" fill="#0f172a" />
      <rect x="170" y="160" width="50" height="140" fill="#13203a" />
      <rect x="230" y="60" width="80" height="240" fill="#0b1326" />
      <rect x="320" y="120" width="60" height="180" fill="#13203a" />
      <rect x="390" y="175" width="90" height="125" fill="#0f172a" />

      {/* Ventanas que titilan */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.rect
          key={i}
          x={100 + (i % 6) * 35}
          y={110 + Math.floor(i / 6) * 28}
          width="8"
          height="10"
          fill="#ea580c"
          animate={{ opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: (i % 7) * 0.4 }}
        />
      ))}

      {/* Grúa de construcción */}
      <g>
        <rect x="340" y="20" width="4" height="100" fill="#64748b" />
        <motion.g
          style={{ originX: "342px", originY: "20px" }}
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="300" y="16" width="90" height="4" fill="#64748b" />
          <line x1="342" y1="20" x2="310" y2="60" stroke="#64748b" strokeWidth="2" />
          <rect x="305" y="58" width="10" height="6" fill="#ea580c" />
        </motion.g>
      </g>
    </svg>
  );
}