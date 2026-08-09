# Ganeshotsav Radio · गणेशोत्सव

> A little mandap on the internet: Marathi festival nostalgia, dhol-tasha energy, and one beautifully simple radio screen.

[Open Ganeshotsav Radio](https://ganesh-sooty.vercel.app/) · [View the source](https://github.com/mangeshraut712/ganeshotsav-radio) · [Follow Mangesh Raut](https://github.com/mangeshraut712)

## The story

Ganesh Chaturthi is remembered through small, familiar details: the first drumbeat from the next lane, aarti beginning at home, marigold strings over a neighbourhood entrance, and the song everyone knows before the chorus arrives.

Ganeshotsav Radio turns that feeling into a single-screen web experience. It brings together a warm Ganesh festival illustration, a Devanagari title, a compact liquid-glass player, and a hand-curated queue of Marathi aartis, bhajans, and procession songs. The goal is deliberately modest: open one page, press play, and feel instantly at home.

This 2026 edition is a static, browser-first project built for the web rather than a full music platform. YouTube supplies the playback, while the page supplies the atmosphere, controls, and memory.

## What is included

- Full-viewport Ganeshotsav artwork with dark readability overlays and restrained festive motion.
- A focused Marathi hero title: `गणेश महोत्सव`.
- A liquid-glass music card with cover art, progress scrubbing, play/pause, previous/next, shuffle, YouTube, and playlist controls.
- A hidden-by-default “mandap queue” with 16 Ganesh festival tracks.
- `Ya Re Ya` as the intentional opening track; shuffle is always a user action.
- Responsive layouts tested at desktop and narrow mobile widths, including 320 px.
- Spotify and YouTube Music entry points for continuing the listening session on the original platforms.
- GitHub-linked creator credit for [Mangesh Raut](https://github.com/mangeshraut712).

## Listen

The in-page queue uses YouTube video IDs and metadata. The first song is **Ya Re Ya**, followed by a blend of dhol-tasha cuts, Marathi classics, aartis, and devotional staples.

- [Open the provided Spotify Ganpati Marathi songs playlist](https://open.spotify.com/playlist/1callCuTKdffC9PTur9f3S)
- [Open the provided YouTube festival radio](https://www.youtube.com/watch?v=HUxGk5gPggg&list=RDHUxGk5gPggg&start_radio=1)

No audio files are hosted in this repository. Playback remains on YouTube through the official [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference), and the source buttons link back to the listening platforms.

## 2026 project history

### 9 August 2026 — The idea takes shape

The project started as a Ganesh festival adaptation of the minimal, nostalgia-led radio sites that inspired the visual direction. The first pass established the full-screen composition, local Ganesh artwork, Marathi festival copy, fixed edge metadata, and a compact floating player.

### 9 August 2026 — The experience becomes Ganesh-specific

The generic visual language was replaced with a Ganeshotsav palette, mandap lighting, devotional copy, Ganesh logo/favicon assets, and a Marathi-first track queue. The layout was tuned around the supplied desktop and mobile references instead of a long scrolling music dashboard.

### 10 August 2026 — Public 2026 release

The release locked `Ya Re Ya` as the opener, expanded the queue to 16 curated festival songs, corrected the Spotify and YouTube Music brand treatments, added the Mangesh Raut GitHub credit, and published the site on Vercel. The repository was then rebranded as `ganeshotsav-radio` with focused GitHub topics and a release README.

## How it works

1. `index.html` defines the semantic page shell, player controls, source links, queue disclosure, and metadata.
2. `styles.css` provides the full-viewport composition, liquid-glass surfaces, responsive layout, focus states, and reduced-motion behavior.
3. `songs.js` contains the curated track metadata and YouTube video IDs.
4. `app.js` loads the official YouTube IFrame API, maps its state into the custom player, and manages progress, queue selection, shuffle, keyboard controls, and playback errors.
5. The site is served as static files. There is no application server, database, build pipeline, or local audio storage.

## Run locally

Use any local HTTP server. Python is enough:

```bash
python3 -m http.server 8080
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

Opening `index.html` directly with a `file://` URL is not recommended because browser security rules can prevent the YouTube iframe API from initializing correctly.

## Project map

| Path | Purpose |
| --- | --- |
| `index.html` | Semantic page shell, metadata, source links, player, and queue markup |
| `styles.css` | Festival visual system, responsive rules, glass player, and accessibility states |
| `app.js` | YouTube API integration and player interaction logic |
| `songs.js` | 16-track Ganeshotsav queue and YouTube metadata |
| `ganesh background.png` | Active full-bleed Ganesh festival background |
| `ganesh logo.png` | Ganesh logo used for the favicon and touch icon |
| `docs/superpowers/` | Design brief and implementation history for the 2026 build |
| `CHANGELOG.md` | Release-level project history |

## Curate the queue

Add or edit a track in `songs.js`:

```js
{
  id: "VIDEO_ID",
  youtubeId: "VIDEO_ID",
  title: "Song title",
  artist: "Artist",
  album: "Optional album or film",
}
```

Cover art is loaded from the corresponding YouTube thumbnail:

```text
https://i.ytimg.com/vi/{VIDEO_ID}/hqdefault.jpg
```

Keep the first entry as the desired opening track. Shuffle is handled in the UI and does not change the curated order in `songs.js`.

## Deploy

The project has no build step. To deploy the current directory to Vercel:

```bash
vercel deploy . --prod
```

The current production site is [ganesh-sooty.vercel.app](https://ganesh-sooty.vercel.app/).

## Verification

The 2026 release was checked with:

```bash
node --check app.js
node --check songs.js
```

The page was also opened through a local HTTP server and checked in a real browser at 1440×900, 390×844, and 320×844. The page had no horizontal overflow, the opener was `Ya Re Ya`, and the 16-song queue opened without breaking the layout.

## Design notes and credits

The visual direction is inspired by the minimal reskinned-radio format of [saloon.wtf](https://saloon.wtf), [Nostalgia Hits](https://nostalgiahits.in/), and [Vadodara Garba](https://garba.jdhruv.workers.dev/). This project uses its own Ganesh-specific artwork, copy, layout decisions, and playlist metadata.

- Product and implementation: [Mangesh Raut](https://github.com/mangeshraut712)
- Playback platform: [YouTube](https://www.youtube.com/)
- External listening: [Spotify](https://open.spotify.com/) and [YouTube Music](https://music.youtube.com/)
- Festival message: **गणपती बाप्पा मोरया!**

Music, platform marks, and linked artwork remain subject to their respective owners and platform terms. This repository does not redistribute the songs.

## License

No open-source license has been declared for this project yet. The repository is public for transparency and demonstration; please do not redistribute the artwork or linked music without the appropriate rights.
