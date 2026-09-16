/**
 * Device capability tiering system.
 *
 * Replaces the broken `isLowEndDevice()` which depended on
 * `navigator.deviceMemory` — an API that Safari/WebKit never implements.
 *
 * Every signal is optional with a sensible default so the function
 * produces a correct result on every browser engine.
 */

export type DeviceTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TierConfig {
  /** Number of intro frames to decode/hold */
  introFrameCount: number;
  /** Number of campus frames to decode/hold */
  campusFrameCount: number;
  /** Max concurrent decode operations */
  batchConcurrency: number;
  /** Canvas devicePixelRatio cap */
  canvasDprCap: number;
  /** Whether to bake decoded images into offscreen canvases (prevents iOS eviction) */
  useOffscreenCache: boolean;
  /** How many frames ahead/behind current index to keep decoded */
  windowSize: number;
  /** Minimum frames needed before unlocking the loading gate */
  gateFrameCount: number;
}

/** Detect whether we're on an iOS device (iPhone/iPad/iPod) */
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Detect whether the viewport qualifies as "mobile" */
function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Determine the device's capability tier based on available signals.
 *
 * Signal priority:
 *   1. hardwareConcurrency (universally available, most reliable)
 *   2. viewport + devicePixelRatio (structural indicator)
 *   3. deviceMemory (Chromium bonus, never required)
 *   4. iOS detection (for rendering-path selection, NOT performance guessing)
 */
export function getDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return 'MEDIUM'; // SSR default
  }

  const cores = navigator.hardwareConcurrency || 0;
  const memory: number =
    'deviceMemory' in navigator ? (navigator as any).deviceMemory : -1;
  const isMobile = isMobileViewport();
  const isIOS = isIOSDevice();
  const dpr = window.devicePixelRatio || 1;

  // --- Definitive LOW signals ---
  // Very few cores (≤3) on a mobile device is a clear low-end indicator
  if (cores > 0 && cores <= 3 && isMobile) return 'LOW';
  // Chromium reports very low memory
  if (memory > 0 && memory <= 2) return 'LOW';

  // --- Definitive HIGH signals ---
  // Desktop with 8+ cores is always HIGH
  if (!isMobile && cores >= 8) return 'HIGH';
  // Desktop with 6+ cores and decent memory (or unknown memory = assume fine)
  if (!isMobile && cores >= 6 && (memory < 0 || memory >= 6)) return 'HIGH';
  // High-end mobile Android: 8+ cores
  if (isMobile && !isIOS && cores >= 8) return 'HIGH';

  // --- MEDIUM: everything else ---
  // This covers:
  //   - All iPhones (typically 6 cores, no deviceMemory)
  //   - Mid-range Android (4-7 cores)
  //   - Desktop with 4-5 cores
  //   - High-DPR mobile (even if cores are decent, the GPU work is heavy)
  // A high-DPR mobile device with only moderate cores gets MEDIUM, not HIGH
  if (isMobile && dpr >= 3 && cores <= 7) return 'MEDIUM';

  // Desktop with moderate cores
  if (!isMobile && cores >= 4) return 'MEDIUM';

  // Mobile with 4-7 cores
  if (isMobile && cores >= 4) return 'MEDIUM';

  // Fallback: if we genuinely can't tell, MEDIUM is safe
  return 'MEDIUM';
}

/**
 * Map a device tier to concrete configuration values.
 */
export function getTierConfig(tier?: DeviceTier): TierConfig {
  const t = tier ?? getDeviceTier();

  switch (t) {
    case 'HIGH':
      return {
        introFrameCount: 150,
        campusFrameCount: 180,
        batchConcurrency: 12,
        canvasDprCap: 2,
        useOffscreenCache: false,
        windowSize: 150, // HIGH tier holds everything
        gateFrameCount: 30, // Need 30 frames before unlocking
      };
    case 'MEDIUM':
      return {
        introFrameCount: 30,
        campusFrameCount: 36,
        batchConcurrency: 6,
        canvasDprCap: 1,
        useOffscreenCache: true,
        windowSize: 20, // Rolling window of 20 frames
        gateFrameCount: 10, // Need 10 frames before unlocking
      };
    case 'LOW':
      return {
        introFrameCount: 20,
        campusFrameCount: 24,
        batchConcurrency: 3,
        canvasDprCap: 1,
        useOffscreenCache: true,
        windowSize: 12, // Tight window
        gateFrameCount: 8,
      };
  }
}
