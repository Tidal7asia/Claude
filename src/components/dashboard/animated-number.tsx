"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";

export function AnimatedNumber({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  const motionValue = useMotionValue(0);
  const rendered = useTransform(motionValue, (v) => formatter(v));
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => {
        prev.current = value;
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <motion.span>{rendered}</motion.span>;
}
