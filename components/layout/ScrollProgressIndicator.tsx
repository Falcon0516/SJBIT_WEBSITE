'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgressIndicator() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[101]"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #D4AF7A, #B8965A)',
      }}
    />
  );
}
