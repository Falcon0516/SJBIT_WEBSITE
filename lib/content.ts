import contentData from '../content-data.json';
import React from 'react';

export interface SiteConfig {
  eventName: string;
  tagline: string;
  subTagline: string;
  prizePoolLabel: string;
  prizePoolAmount: number;
  prizePoolDisplay: string;
  pillars: string[];
  campusName: string;
  registerCtaLabel: string;
  registerCtaUrl: string;
  notes: string;
}

export interface HeroOverlayFrame {
  scrollStart: number;
  scrollEnd: number;
  heading: string;
  sub: string;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  icon: string;
  colorHex: string;
  bgTintHex: string;
  exploreUrl: string;
}

export interface ContentData {
  site: SiteConfig;
  heroOverlayTimeline: HeroOverlayFrame[];
  events: EventItem[];
}

// Cast the imported JSON to our strict types
export const content = contentData as ContentData;

// Helper to easily get inline styles for event cards
export function getEventTheme(event: EventItem) {
  return {
    '--accent': event.colorHex,
    '--accent-bg': event.bgTintHex,
  } as React.CSSProperties;
}
