# Ganesh Festival Radio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reframe the existing Ganeshotsav Radio page as a full-screen Ganesh festival landing experience inspired by the supplied radio-site references while preserving its YouTube playlist behavior.

**Architecture:** Keep the static HTML/CSS/vanilla-JavaScript structure already present in the workspace. Replace the page shell and stylesheet to establish a full-viewport hero and compact glass player; make only the smallest JavaScript changes required for the new shell and metadata.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, YouTube IFrame Player API, Google Fonts, remote Unsplash hero image.

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

- [ ] Replace the existing long-form radio composition with a semantic `main` containing the fixed status badge, Ganesh hero copy, compact player card, hidden playlist panel, and fixed footer metadata.
- [ ] Keep all control IDs and accessible labels required by `app.js`.
- [ ] Update title, description, Open Graph copy, and visible copy to use Ganesh Chaturthi / Ganeshotsav language.
- [ ] Keep the YouTube API and existing scripts loaded after the page markup.

### Task 2: Rebuild the reference-inspired visual system

**Files:**
- Modify: `/Users/mangeshraut/Downloads/ganesh/styles.css`

**Interfaces:**
- Consumes: semantic classes from `index.html` and state classes toggled by `app.js`, including `.is-playing`, `.is-active`, `[hidden]`, and `.show`.
- Produces: responsive layout, readable contrast, focus states, player states, and reduced-motion behavior.

- [ ] Establish a full-viewport red/saffron/indigo background with a remote Unsplash Ganesha image, dark readability overlays, glow layers, and restrained marigold particles.
- [ ] Position the hero toward the upper middle of the page and the player near the bottom with the same compact proportions as the references.
- [ ] Make the player card translucent with rounded borders, blur, a small circular cover, and compact controls; expand the card to a vertical layout below 640px.
- [ ] Style the playlist as a compact translucent panel with active-track treatment and keyboard focus visibility.
- [ ] Add safe-area padding, responsive typography, touch-friendly hit targets, and `prefers-reduced-motion` fallbacks.
- [ ] Remove styles that only supported the old large centered player or the tall scrolling layout.

### Task 3: Make the player metadata resilient in the compact shell

**Files:**
- Modify: `/Users/mangeshraut/Downloads/ganesh/app.js`

**Interfaces:**
- Consumes: the existing playlist and YouTube API callbacks.
- Produces: the same control behavior with compact-shell loading and error states.

- [ ] Keep playback, progress, queue, keyboard, shuffle, and error logic unchanged unless required by the new markup.
- [ ] Add a compact loading label before the YouTube player is ready and retain a readable fallback when a track thumbnail fails.
- [ ] Ensure the random initial track and online badge still render without blocking the hero.

### Task 4: Verify the static experience

**Files:**
- Test: `/Users/mangeshraut/Downloads/ganesh/index.html`, `/Users/mangeshraut/Downloads/ganesh/styles.css`, `/Users/mangeshraut/Downloads/ganesh/app.js`, `/Users/mangeshraut/Downloads/ganesh/songs.js`

**Interfaces:**
- Consumes: the completed static page.
- Produces: fresh syntax, HTTP, and responsive interaction evidence.

- [ ] Run `node --check app.js` and `node --check songs.js`; expect exit code 0 for both.
- [ ] Start `python3 -m http.server 8080`, then run `curl -fsS http://127.0.0.1:8080/` and confirm the response contains `Ganeshotsav Radio`, `queueBtn`, and the stylesheet link.
- [ ] Use a real browser smoke pass at desktop and mobile widths to confirm the page has no horizontal overflow, the playlist toggle opens, and the main player controls are present.
- [ ] Stop the local server after verification and report any YouTube-network-only limitations separately from page-level behavior.

### Task 5: Apply screenshot-led visual refinement

**Files:**
- Modify: `/Users/mangeshraut/Downloads/ganesh/index.html`
- Modify: `/Users/mangeshraut/Downloads/ganesh/styles.css`
- Modify: `/Users/mangeshraut/Downloads/ganesh/app.js`

**Interfaces:**
- Consumes: the existing player IDs and the supplied screenshot references.
- Produces: a minimal edge-metadata shell, a two-line Devanagari festival title, and a single wide bottom player card.

- [ ] Replace the branded top header and extra hero labels with a small clock at left, online badge at center, and YouTube Music link at right.
- [ ] Use a display Devanagari face for a large two-line `गणपती / बाप्पा मोरया` title, a short one-line festival tagline, and strong contrast over a vivid background.
- [ ] Collapse the player to one wide low-profile card and keep YouTube/playlist actions as compact icon controls inside the control row.
- [ ] Verify the card remains readable at 320px wide and the bottom-corner visitor/credit metadata stays out of the main composition.
