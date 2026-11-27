import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";

// Counts up to `value` the first time it scrolls into view.
export default function AnimatedNumber({ value, duration = 1.4, delay = 0, className }) {
  const ref = useRef(null);
  const target = Number(value) || 0;
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(reduceMotion ? target : 0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(target);
      return undefined;
    }
    if (!inView) return undefined;
    const controls = animate(motionValue, target, { duration, delay, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, target, duration, delay, reduceMotion, motionValue]);

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}
