# Changelog

All notable project milestones are recorded here. Dates use the India Standard Time release context for the 2026 build.

## [2026.08.12] — Focused player surface and mobile parity

### Improved

- Removed the in-card `Mandap Radio`, ghanti, shankh, and keyboard-shortcut toolbar so the music card stays focused on listening.
- Rebuilt the playback rail with a real three-column grid; the play button now stays centered against the card on desktop, tablet, and narrow mobile widths.
- Kept the mobile card spacious with a full track row, readable metadata, generous progress spacing, and controls that do not clip at 320 px.
- Reused the top Spotify and YT Music links as the mobile source destinations instead of duplicating a crowded external-link control inside the card.
- Made local development skip the production-only Vercel Analytics request, while preserving the production loader.

### Fixed

- Removed dead CSS and event wiring for the deleted ambient sound and shortcut controls.
- Added safe parsing for malformed saved volume, repeat, and favorites preferences.
- Added keyboard seeking to the progress control without letting the global arrow-key track navigation steal focus.

## [2026.08.10] — 30-track playback and alignment polish

### Added

- 5 additional non-duplicate Ganpati/Ganesha singles, expanding the listening run from 25 to 30 songs.
- `Maza Bappa Aala`, `Bappa`, `Gajanana`, `Ganapati Tu Sarvashreshth`, and `Ganpati Tu Gunapati Tu` from official or artist-published YouTube sources.
- Vercel Web Analytics through the documented static loader and the locked `@vercel/analytics@2.0.1` dependency.

### Improved

- Centered the primary play action inside a balanced control rail on desktop and mobile.
- Added a visible buffering state and guarded YouTube error skipping against duplicate callbacks.
- Replaced non-embeddable legacy video IDs with individually checked Ganpati singles so the queue does not silently skip during normal playback.
- Kept the queue order deterministic with `Ya Re Ya` as track 1 and the new songs closing the 30-track run.

### Verified

- All 30 YouTube IDs are unique.
- Browser transition audit matched every expected title and video ID across 30 next-track actions, then wrapped to `Ya Re Ya`.
- Slower per-track browser audit kept all 30 selected tracks in the playing state with zero source mismatches.
- Desktop and mobile layouts remained free of horizontal overflow.
- Production analytics smoke check returned `200` for both the loader and the page-view endpoint.

## [2026.08.10] — 25-song queue expansion

### Added

- 9 additional non-duplicate Ganpati/Ganesha tracks, expanding the listening run from 16 to 25 songs.
- More procession energy, Marathi classics, aarti staples, and Ganesh mantras from verified YouTube sources.

### Verified

- `Ya Re Ya` remains track 1.
- All 25 YouTube IDs are unique.
- The queue renders all 25 entries without mobile or desktop overflow.

## [2026.08.10] — Ganeshotsav Radio public release

### Added

- Initial 16-track Ganeshotsav queue with `Ya Re Ya` as the intentional opener.
- Spotify playlist and YouTube festival-radio links.
- Responsive liquid-glass player and hidden-by-default mandap queue.
- Ganesh background, logo, favicon, Marathi title, and Mangesh Raut GitHub credit.
- Static hosting and Vercel production deployment.
- Repository README, project story, implementation notes, and release history.

### Improved

- Desktop and mobile spacing, typography, player proportions, and source-brand colors.
- YouTube Music icon treatment using the familiar red circular mark with white ring and play symbol.
- Initial playback order so the curated opener is stable while shuffle remains opt-in.
- Repository metadata and topic taxonomy for easier discovery.

### Removed

- Unused legacy background artwork and local macOS metadata from the release scope.

## [2026.08.09] — Festival experience prototype

- Established the full-screen Ganesh festival composition.
- Added the custom YouTube-powered player, source links, queue behavior, and responsive shell.
- Tuned the design from the supplied desktop and mobile references.
