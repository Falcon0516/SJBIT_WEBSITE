# Silver Jubilee TechFest — Website Build Package

This package has three parts:
1. **What I found in your two files** (so you know what the agent will actually be working with)
2. **Setup checklist** — what to physically put in the Antigravity workspace before you run the prompt
3. **The Master Prompt** — copy the whole fenced block into Antigravity exactly as-is

---

## 1. Asset Analysis

**`Screenshot_2026-09-09_at_9_14_58_PM.png`** — this is your content source. It's a poster titled *"Ideas Today, Solutions Tomorrow"*, prize pool ₹4,00,000, tagline "WIN | LEARN | SHOWCASE," side-tag "Skills. Ideas. Impact. For a Brighter Tomorrow," and a list of 8 events, each with its own accent color, an icon, a description, and 3–4 one-word tags. I've extracted every one of these into `content-data.json` (included alongside this doc) — exact titles, descriptions, tags, and a matched hex color per card sampled from the poster itself.

**`A_brief_cinematic_light_streak.mp4`** — heads up, this is **not** an abstract light-streak animation, it's real drone/aerial footage: it opens on a construction site (bare concrete slab, rebar, cranes) and pushes through to a completed campus building with an **"SJBIT"** sign, ending on a wide aerial establishing shot of the full campus. Specs: 1280×720, 24fps, H.264+AAC, 30 seconds, ~13.8MB.

That's actually a *better* asset for this concept than a generic light streak — "25 years, built from the ground up" is a natural scroll-scrubbing narrative (construction → completion → aerial reveal → events). The master prompt below is written around **this** footage. If you later swap in a true 3D render, just drop it in the same file path (`/public/videos/hero-source.mp4`) at a similar aspect ratio and everything downstream still works.

> **Note on assumptions:** the poster doesn't give an event name, dates, venue, or a registration link. I've used `"SJBIT Silver Jubilee TechFest"` as a placeholder name and dummy `REPLACE-ME` URLs throughout `content-data.json`. Find-and-replace those two things once, everywhere, before launch.

---

## 2. Workspace Setup Checklist (do this before running the prompt)

```
your-project/
├── public/
│   ├── videos/
│   │   └── hero-source.mp4        ← rename & place your uploaded video here
│   └── images/
│       └── poster-reference.png   ← (optional) the screenshot, for the agent's reference only
├── content-data.json              ← the file generated alongside this doc — place at project root
```

1. Create a new empty folder for the project (or an empty Next.js repo) and open it in Antigravity.
2. Rename your video to `hero-source.mp4` and place it at `public/videos/hero-source.mp4`.
3. Drop `content-data.json` (provided with this message) into the **project root**.
4. Paste the Master Prompt below into Antigravity as your first instruction, in one go. Don't split it into multiple messages — the agent needs the whole spec to plan the architecture correctly.
5. After the first pass, do a find-and-replace across the repo for `REPLACE-ME` (registration links) and the placeholder event name/dates, once your organizing committee finalizes them.

---

## 3. The Master Prompt

Copy everything inside the fenced block below into Antigravity.

````
You are building a production-grade Next.js marketing/showcase website for a college's Silver Jubilee Tech Fest. This is not a prototype — ship fully working, polished, responsive code with no placeholder lorem ipsum. All real content is provided in `content-data.json` at the project root; read it and use it as the single source of truth for every piece of copy, color, and link. Do not invent event names or descriptions — use exactly what's in that file.

═══════════════════════════════════════
PROJECT OVERVIEW
═══════════════════════════════════════
Site name (placeholder, from content-data.json): "SJBIT Silver Jubilee TechFest"
Tagline: "Ideas Today, Solutions Tomorrow"
One page, single scroll journey, two acts:
  ACT 1 — a pinned, scroll-scrubbed cinematic video hero (the campus's construction-to-completion drone footage) with timed text/stat overlays.
  ACT 2 — an animated reveal into an 8-card grid of flagship events, each linking out to its own registration page.
Tone: premium, cinematic, confident — think Apple product pages or a university's 25th-anniversary microsite. NOT a typical bootstrap-template college fest page. No stock "confetti and neon gradients" aesthetic — restrained, editorial, generous whitespace, warm ivory/cream base (matching the poster's #F7F1E6-ish background) contrasted with a near-black cinematic hero.

═══════════════════════════════════════
TECH STACK (use exactly this)
═══════════════════════════════════════
- Next.js 14+ App Router, TypeScript, strict mode
- Tailwind CSS for styling (extend the theme with the color tokens below — don't hardcode hex in components)
- Framer Motion for element-level reveal/hover/tap animations
- GSAP + ScrollTrigger for the scroll-scrubbed video hero and the pinned-section choreography (Framer Motion's scroll hooks are NOT precise enough for frame-accurate video scrubbing — use GSAP ScrollTrigger with `scrub: true` for the hero specifically)
- lucide-react for all icons (icon names are specified per event in content-data.json)
- No CSS-in-JS libraries, no jQuery, no video.js — native <video>/<canvas> APIs only
- Deployed target: Vercel (structure the app so `next build` works cleanly with zero warnings)

═══════════════════════════════════════
FILE / FOLDER STRUCTURE
═══════════════════════════════════════
app/
  layout.tsx              (metadata, fonts, global providers)
  page.tsx                (composes HeroScrub + EventsSection + Footer)
  globals.css
components/
  hero/
    HeroScrub.tsx         (the pinned canvas-scrubbing hero, see spec below)
    HeroOverlay.tsx        (timed text/stat overlays inside the hero)
  events/
    EventsSection.tsx      (section header + grid)
    EventCard.tsx          (single card, reusable)
  layout/
    Footer.tsx
    ScrollProgressIndicator.tsx  (thin bar at very top of viewport, fills as user scrolls hero)
lib/
  content.ts              (typed loader/parser for content-data.json — define TS interfaces here: SiteConfig, HeroOverlayFrame, EventItem)
public/
  videos/hero-source.mp4  (already placed by the user)
content-data.json          (already placed at root by the user — import and type it, do not duplicate its data inline in components)

═══════════════════════════════════════
HERO SECTION — CANVAS SCROLL-SCRUBBING SPEC
═══════════════════════════════════════
This is the centerpiece feature. Build it like this:

1. Structure: a wrapper section with height `400vh` (this is the scroll "runway"). Inside it, a `position: sticky; top: 0; height: 100vh` inner container that stays pinned to the viewport while its parent's 400vh scrolls past. Use GSAP ScrollTrigger with `pin: true` on this container instead of relying purely on CSS sticky, so pinning is scroll-scrub-safe across browsers.

2. Canvas, not a raw <video> tag, for the visible frame: create an off-screen <video> element (muted, playsInline, preload="auto", src="/videos/hero-source.mp4"), and a visible <canvas> sized to the viewport. On every scroll tick (via ScrollTrigger's `onUpdate`, not a scroll event listener — avoid layout thrashing), compute `progress` (0 to 1) from ScrollTrigger, map it to `video.currentTime = progress * video.duration`, wait for the `seeked` event (or use `requestVideoFrameCallback` if available, falling back to a small rAF-driven poll), then `ctx.drawImage(video, 0, 0, canvas.width, canvas.height)` using `object-fit: cover` math (compute source/destination rects so the video covers the canvas without distortion, cropping symmetrically). This gives frame-accurate scroll scrubbing instead of laggy native video seeking.

3. Debounce/throttle the seek so you don't queue more than one pending seek at a time (track a boolean `isSeeking` and skip new seeks while one is in flight, always jumping to the latest requested progress once the previous seek resolves) — this is critical for smoothness on fast scroll.

4. Loading: show a blurred placeholder (extract and ship a static poster frame as `public/images/hero-poster.jpg` — instruct the user to generate this by grabbing frame 1 of their video if it's not present) while the video buffers; fade the canvas in once `loadeddata` fires.

5. Overlay text and stats: layer a `HeroOverlay` component absolutely positioned over the canvas. Drive its content from `heroOverlayTimeline` in content-data.json — each entry has `scrollStart`/`scrollEnd` (0–1 fractions of the hero's scroll progress) plus a heading/sub. Cross-fade + slight upward-slide (Framer Motion) between entries as `progress` crosses each entry's boundaries — don't just show/hide abruptly. When the timeline entry containing the prize pool appears, animate the ₹ amount counting up from 0 to `prizePoolAmount` over ~1.2s using a simple rAF-driven counter (no external counting library needed).

6. End-of-hero cue: in the final ~10% of hero scroll progress, fade in a bouncing "Scroll to explore 8 flagship events" chevron/prompt, then cross-fade the hero into the Events section using a smooth clip-path or opacity/scale transition (avoid a hard cut).

7. Accessibility & fallback: respect `prefers-reduced-motion` — when set, skip the pinned scrub entirely, show the hero as a normal static full-bleed poster image with the final overlay text state, and let the page scroll normally past it. Also fully pause/release the ScrollTrigger and video decoding when the hero scrolls far out of view (cleanup in useEffect return) to avoid battery drain further down the page.

8. Mobile: video scrubbing is expensive on low-end phones — on viewports under 768px, still use the pinned scroll-scrub but reduce the runway to `250vh` and drop the frame rate of canvas redraws (throttle to every 2nd scroll tick) to protect performance; canvas sizing must use `devicePixelRatio` capped at 2 to avoid oversized backing stores.

═══════════════════════════════════════
EVENTS SECTION SPEC
═══════════════════════════════════════
1. Section header, centered: subTagline from content-data.json ("Skills. Ideas. Impact. For a Brighter Tomorrow.") as a large serif/display headline, with the three pillars ("WIN · LEARN · SHOWCASE") as a small tracked-out label above or below it.

2. Grid: responsive — 1 column on mobile, 2 columns on tablet+desktop (do NOT go to 3+ columns even on very wide screens; keep cards generously sized, this reads as premium rather than a dense directory). Render one `EventCard` per item in `events[]` from content-data.json, in the given order (numbered 01–08).

3. EventCard contents, top to bottom: the numeric id badge (large, tabular-nums, in the card's `colorHex`), the lucide icon named in the `icon` field (rendered in a soft rounded tile tinted with `bgTintHex`, icon stroke in `colorHex`), the title, the description, the tags rendered as small pill/chip labels stacked or inline (uppercase, tracked-out, colorHex text on bgTintHex chip background), and an "Explore Now →" button pinned to the card's bottom.

4. "Explore Now" button behavior: it's an `<a>` tag with `href={event.exploreUrl}` (from content-data.json — currently placeholder REPLACE-ME URLs), `target="_blank" rel="noopener noreferrer"`. Style it filled with the card's `colorHex`, white text, subtle scale/shadow on hover. This is intentionally a real outbound link per card, not a modal — each event has (or will have) its own dedicated registration microsite.

5. Reveal animation: use Framer Motion `whileInView` with a staggered delay (~0.08s increment) across the grid so cards rise + fade in as the section scrolls into view, once, not on every re-entry. Add a subtle hover lift (translateY -4px, soft shadow) and a slight border/ring in the card's colorHex on hover — no gimmicky 3D tilts, keep it restrained and premium.

6. Card background is a very light neutral (near-white/cream), NOT the saturated bgTintHex — use bgTintHex only for small accents (icon tile, chips) so the grid doesn't look like a rainbow of pastel blocks; the accent color is the signal, not the whole card surface.

═══════════════════════════════════════
FOOTER
═══════════════════════════════════════
Restate the prize pool and tagline, a primary CTA button using `registerCtaUrl` from content-data.json labeled `registerCtaLabel`, and placeholder social icons (Instagram/LinkedIn/X — use `#` hrefs, clearly marked with a `// TODO: add real social links` comment). Keep it minimal — one or two lines, not a sprawling multi-column footer.

═══════════════════════════════════════
DESIGN SYSTEM
═══════════════════════════════════════
- Base page background: warm ivory `#F7F1E6`
- Hero background (while video/canvas loads or in reduced-motion fallback): near-black `#0B0B0C`
- Display/headline font: an elegant serif or high-contrast display face (e.g. "Playfair Display" or "Fraunhofer" via next/font/google) for section headlines and the hero overlay text — echoing the script/serif logotype on the poster
- Body/UI font: a clean grotesk (e.g. "Inter" or "Poppins") for descriptions, tags, buttons, nav
- Per-event color tokens: read `colorHex` / `bgTintHex` straight from content-data.json per card — do not hardcode a second copy of these values in Tailwind config; instead expose them as inline CSS variables per card (`style={{ '--accent': event.colorHex }}`) or via a small `getEventTheme(event)` helper in lib/content.ts
- Spacing: generous — this should feel unhurried, not like a dense fest flyer. Big line-heights, big vertical rhythm between sections.
- Round corners consistently (~1rem on cards, ~9999px on chips/buttons)

═══════════════════════════════════════
PERFORMANCE & SEO
═══════════════════════════════════════
- Use `next/font` for font loading (no FOUT), `next/image` for all static images/icons that aren't lucide SVGs
- Video: don't autoplay-loop a native <video> in the DOM for looks — the ONLY video usage is the offscreen source feeding the canvas scrubber described above. Set `preload="auto"` on it and lazy-create it only once the hero section is near the viewport (IntersectionObserver) so it doesn't compete with initial page load
- Add proper `<meta>` via the App Router `metadata` export in layout.tsx: title, description (pull from tagline/subTagline), and an OG image (use the poster reference or a hero frame)
- Run through a mental Lighthouse pass: no layout shift from the canvas (give it an explicit aspect-ratio/sized wrapper), no unused JS shipped to the client for sections that don't need interactivity (mark only the interactive pieces `"use client"`)

═══════════════════════════════════════
ACCEPTANCE CRITERIA — verify before declaring done
═══════════════════════════════════════
1. `npm run build` completes with zero TypeScript errors and zero console warnings.
2. Scrolling through the hero visibly scrubs the video forward and backward in both scroll directions, staying pinned for the full runway, with overlay text/stat changes timed to scroll position as specified.
3. All 8 events from content-data.json render in the grid, in order, with correct title/description/tags/colors/icons — verify against the JSON, not from memory.
4. Every "Explore Now" button opens its `exploreUrl` in a new tab.
5. Page is fully usable and looks intentional (not broken) on a 375px-wide mobile viewport and on a 1440px desktop viewport.
6. With `prefers-reduced-motion: reduce` simulated, the hero degrades to a static image with no pinning/scrubbing, and the rest of the page still scrolls and functions normally.
7. No lorem ipsum, no "TODO" text visible anywhere in rendered UI except the explicitly marked footer social placeholders.

Build it now, end to end, and report back what you built plus any assumptions you had to make beyond what's in content-data.json.
````

---

### After the agent finishes

- Preview the site locally, scroll through the hero once at normal speed and once by dragging the scrollbar fast — confirm the seek queuing (spec item 3) actually keeps it smooth.
- Swap in the real registration URLs and finalized event name/dates by editing `content-data.json` only — nothing else in the codebase should need touching for a content update, which is the whole point of centralizing it there.
- If Antigravity asks about the missing poster/OG frame, tell it to grab frame 1 of `hero-source.mp4` — that's a fine static fallback.
