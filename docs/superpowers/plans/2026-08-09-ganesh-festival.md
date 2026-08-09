# Ganesh Festival Radio Implementation Plan

> **Status:** Completed on 10 August 2026. This document records the implementation history for the public 2026 release.

**Goal:** Reframe the existing Ganeshotsav Radio page as a full-screen Ganesh festival landing experience inspired by the supplied radio-site references while preserving its YouTube playlist behavior.

**Architecture:** Keep the static HTML/CSS/vanilla-JavaScript structure already present in the workspace. Replace the page shell and stylesheet to establish a full-viewport hero and compact glass player; make only the smallest JavaScript changes required for the new shell and metadata.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, YouTube IFrame Player API, Google Fonts, and local Ganesh festival artwork.

## Global Constraints

- Keep the site buildless and compatible with `python3 -m http.server`.
- Keep audio playback on the official YouTube IFrame API; do not add local music files.
- Keep the existing playlist and controls unless a layout change requires a selector update.
- Use only the current files plus the two design documents; do not introduce a framework or dependency.
- The main experience must fit one viewport at common desktop and mobile widths without horizontal scrolling.

### Task 1: Rebuild the single-page festival shell

**Files:**
- Modify: `/Users/mangeshraut/Downloads/ganesh/index.html`

**Interfaces:**
- Consumes: existing IDs used by `/Users/mangeshraut/Downloads/ganesh/app.js`.
- Produces: the DOM contract for `cover`, `title`, `artist`, `fill`, `knob`, `scrub`, `currentTime`, `duration`, `play`, `prev`, `next`, `shuffle`, `openYt`, `queueBtn`, `queue`, `queueList`, `queueCount`, `onlineCount`, `toast`, `petals`, and `yt-player`.

- [x] Replace the existing long-form radio composition with a semantic `main` containing the fixed status badge, Ganesh hero copy, compact player card, hidden playlist panel, and fixed footer metadata.
- [x] Keep all control IDs and accessible labels required by `app.js`.
- [x] Update title, description, Open Graph copy, and visible copy to use Ganesh Chaturthi / Ganeshotsav language.
- [x] Keep the YouTube API and existing scripts loaded after the page markup.

### Task 2: Rebuild the reference-inspired visual system

**Files:**
- Modify: `/Users/mangeshraut/Downloads/ganesh/styles.css`

**Interfaces:**
- Consumes: semantic classes from `index.html` and state classes toggled by `app.js`, including `.is-playing`, `.is-active`, `[hidden]`, and `.show`.
- Produces: responsive layout, readable contrast, focus states, player states, and reduced-motion behavior.

- [x] Establish a full-viewport red/saffron/indigo background with local Ganesh artwork, dark readability overlays, glow layers, and restrained marigold particles.
- [x] Position the hero toward the upper middle of the page and the player near the bottom with the same compact proportions as the references.
- [x] Make the player card translucent with rounded borders, blur, a small circular cover, and compact controls; expand the card to a vertical layout below 640px.
- [x] Style the playlist as a compact translucent panel with active-track treatment and keyboard focus visibility.
- [x] Add safe-area padding, responsive typography, touch-friendly hit targets, and `prefers-reduced-motion` fallbacks.
- [x] Remove styles that only supported the old large centered player or the tall scrolling layout.

### Task 3: Make the player metadata resilient in the compact shell

**Files:**
- Modify: `/Users/mangeshraut/Downloads/ganesh/app.js`

**Interfaces:**
- Consumes: the existing playlist and YouTube API callbacks.
- Produces: the same control behavior with compact-shell loading and error states.

- [x] Keep playback, progress, queue, keyboard, shuffle, and error logic unchanged unless required by the new markup.
- [x] Add a compact loading label before the YouTube player is ready and retain a readable fallback when a track thumbnail fails.
- [x] Ensure the deterministic `Ya Re Ya` opener and online badge render without blocking the hero.

### Task 4: Verify the static experience

**Files:**
- Test: `/Users/mangeshraut/Downloads/ganesh/index.html`, `/Users/mangeshraut/Downloads/ganesh/styles.css`, `/Users/mangeshraut/Downloads/ganesh/app.js`, `/Users/mangeshraut/Downloads/ganesh/songs.js`

**Interfaces:**
- Consumes: the completed static page.
- Produces: fresh syntax, HTTP, and responsive interaction evidence.

- [x] Run `node --check app.js` and `node --check songs.js`; both pass.
- [x] Start a local HTTP server and confirm the page shell, `queueBtn`, and stylesheet load.
- [x] Use a real browser smoke pass at 1440×900, 390×844, and 320×844; no horizontal overflow and the playlist toggle opens.
- [x] Stop the local server after verification and keep YouTube-network-only warnings separate from page-level behavior.

### Task 5: Apply screenshot-led visual refinement

**Files:**
- Modify: `/Users/mangeshraut/Downloads/ganesh/index.html`
- Modify: `/Users/mangeshraut/Downloads/ganesh/styles.css`
- Modify: `/Users/mangeshraut/Downloads/ganesh/app.js`

**Interfaces:**
- Consumes: the existing player IDs and the supplied screenshot references.
- Produces: a minimal edge-metadata shell, a two-line Devanagari festival title, and a single wide bottom player card.

- [x] Replace the branded top header and extra hero labels with a small clock at left, online badge at center, and YouTube Music link at right.
- [x] Use a display Devanagari face for a compact two-line `गणेश / महोत्सव` title with strong contrast over a vivid background.
- [x] Collapse the player to one wide low-profile card and keep YouTube/playlist actions as compact icon controls inside the control row.
- [x] Verify the card remains readable at 320px wide and the bottom-corner visitor/credit metadata stays out of the main composition.

## Completion record

- 9 August 2026: single-screen festival shell, local artwork, compact player, queue, and responsive visual system implemented.
- 10 August 2026: deterministic `Ya Re Ya` opener, 16-track queue, brand-link cleanup, browser verification, GitHub publication, and Vercel production release completed.
