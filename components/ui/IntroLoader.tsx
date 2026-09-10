'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function IntroLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Skip on repeat visits
    if (sessionStorage.getItem('sjbit-intro-seen')) {
      return;
    }
    // Skip for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sessionStorage.setItem('sjbit-intro-seen', '1');
      return;
    }
    setShow(true);

    const timer = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem('sjbit-intro-seen', '1');
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#050506]"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center"
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="block font-serif text-7xl sm:text-8xl md:text-9xl tracking-tighter"
              style={{ color: '#D4AF7A' }}
            >
              XXV
            </motion.span>
            <motion.span
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 0.5, letterSpacing: '0.3em' }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="block font-mono text-xs mt-4 uppercase"
              style={{ color: '#F5F3EE' }}
            >
              Silver Jubilee
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
