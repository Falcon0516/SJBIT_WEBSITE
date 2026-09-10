/**
 * Slim icon map — only the Lucide icons actually used in this project.
 * Importing `* as LucideIcons` pulls the entire ~200KB+ library.
 * This file imports only the 13 icons we need, saving ~180KB from the JS bundle.
 */
import {
  BrainCircuit,
  Code2,
  SearchCode,
  Smartphone,
  ShieldCheck,
  Lightbulb,
  Sprout,
  Bot,
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  X,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Map of icon name string → component, used for dynamic lookup from content-data.json */
export const iconMap: Record<string, LucideIcon> = {
  BrainCircuit,
  Code2,
  SearchCode,
  Smartphone,
  ShieldCheck,
  Lightbulb,
  Sprout,
  Bot,
  HelpCircle,
};

/** Get an icon by name, with HelpCircle fallback */
export function getEventIcon(name: string): LucideIcon {
  return iconMap[name] || HelpCircle;
}

// Also re-export frequently used icons for direct import
export {
  ArrowRight,
  ArrowUpRight,
  X,
  Trophy,
  HelpCircle,
};
