"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Counts up to `value` when it first appears or changes. The text is written
 * directly to the DOM node (no React state per frame), and with reduced
 * motion the final value is shown immediately.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 0.8,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = format(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, format, duration, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
