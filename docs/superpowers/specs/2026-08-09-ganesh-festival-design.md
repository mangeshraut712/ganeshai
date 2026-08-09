# Ganesh Festival Radio Design

## Goal

Turn the existing Ganeshotsav Radio prototype into a single-screen Ganesh festival experience with the same visual rhythm as the supplied reference sites: full-viewport atmosphere, minimal fixed metadata, a hero title, and a compact floating music player.

## Product direction

The current YouTube-powered playlist remains the product's functional core. The redesign changes the presentation, not the playback model: YouTube still supplies audio, while the page owns the custom controls, track metadata, progress bar, shuffle state, and playlist disclosure.

The page uses the repository's original Ganesh-specific assets rather than copying reference assets: `ganesh background.png` provides the warm illustrated shrine and crowd scene, while `ganesh logo.png` supplies the favicon and touch icon. The hero title is rendered as separate Devanagari text so it stays readable and responsive over the artwork; the translucent player card sits below it with readability overlays.

## Layout

- Fixed top-center status pill: green live dot plus a small listener count.
- Fixed bottom corners: “Last Visitor: Mumbai, India” and a compact credit line.
- Upper content area: the original Ganeshotsav logo, a short festival tagline, and minimal edge metadata.
- Lower content area: compact player card that expands naturally on small screens without hiding controls.
- Player card: circular cover art, title/artist, seek bar with time labels, shuffle, previous, play/pause, next, and playlist actions.
- Playlist: hidden by default; toggled from the player and rendered within the page flow on mobile and desktop.

## Interaction and accessibility

- Preserve current YouTube API behavior and the curated 25-track playlist, with `Ya Re Ya` as the deterministic opening track.
- Preserve click/tap play, previous/next, shuffle, playlist toggle, YouTube link, cover click, seek dragging, spacebar play/pause, and left/right track navigation.
- Keep the hidden player accessible only to the browser, not visible as a second UI.
- Retain visible focus states, semantic labels, `aria-pressed`, `aria-expanded`, and reduced-motion behavior.
- Keep the player usable at 320px wide and at desktop widths up to 1440px.

## Acceptance checks

1. The page loads from a static server without a build step.
2. The viewport matches the reference composition: no long scroll is required for the main experience, the hero dominates the screen, and the player floats near the bottom.
3. The page is clearly Ganesh-specific in copy, palette, typography, and the local supplied imagery.
4. The YouTube player initializes when the network is available and the custom controls remain usable while it loads.
5. At mobile width, the player stacks cleanly, the playlist remains reachable, and no horizontal overflow occurs.
6. JavaScript syntax checks pass and a local HTTP smoke check returns the updated page shell.

## Screenshot refinement

The supplied reference screenshots establish a more specific visual target for the final pass: a colorful, wide festival scene; minimal edge metadata instead of a branded header; a restrained Devanagari title; a short centered festival message; and one wide, low-profile player card anchored close to the bottom edge. The Ganesh version follows that hierarchy while keeping the reference site's controls available through compact icon actions and crediting Mangesh Raut through the linked GitHub profile.

## 2026 release baseline

The final implementation is intentionally buildless and local-asset-first. It keeps playback on YouTube, keeps the festival queue transparent in `songs.js`, and uses no framework, database, analytics backend, or locally stored music files.
