# Ganeshotsav Radio · गणेशोत्सव

A festive, reskinned music player for **Ganesh Chaturthi** — inspired by [saloon.wtf](https://saloon.wtf), [nostalgiahits.in](https://nostalgiahits.in/), and [garba.jdhruv.workers.dev](https://garba.jdhruv.workers.dev/).

## How it works

Same idea as those sites:

1. **YouTube hosts and streams the audio** via the official [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).
2. The video iframe is **hidden** (1×1 / off-screen).
3. A custom mandap-style UI handles play / pause / next / scrub / playlist.
4. **No music files are stored on this server** — only YouTube video IDs + metadata.

> This is a UI skin over YouTube’s own embed functionality.

## Run locally

Any static file server works. Examples:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Open [http://localhost:8080](http://localhost:8080).

> **Note:** YouTube embeds need a real `http://` or `https://` origin. Opening `index.html` as a `file://` URL often fails.

## Project layout

| File        | Role                                      |
|-------------|-------------------------------------------|
| `index.html`| Page shell + player markup                |
| `styles.css`| Festive mandap UI                         |
| `app.js`    | YouTube API wiring + controls             |
| `songs.js`  | Playlist (YouTube IDs, titles, artists)   |
| `ganesh background.png`          | Current full-bleed Ganesh festival artwork |
| `ganesh-festival-background.png` | Previous generated reference artwork |
| `ganesh logo.png`                | Ganeshotsav logo and favicon source |

## Add or edit songs

Edit `songs.js`:

```js
{
  id: "VIDEO_ID",
  youtubeId: "VIDEO_ID",
  title: "Song title",
  artist: "Artist",
  album: "Optional album / film",
}
```

Cover art is pulled from YouTube thumbnails:

`https://i.ytimg.com/vi/{VIDEO_ID}/hqdefault.jpg`

## Deploy

Drop the folder on any static host:

- Cloudflare Pages / Workers Sites
- Vercel / Netlify
- GitHub Pages
- Any nginx / S3 bucket

No build step required.

## Credits

- Playback: **YouTube**
- Design language: festival mandap · saffron · gold · marigold petals
- Website: [Mangesh Raut](https://github.com/mangeshraut712)
- Inspired by the “reskinned YouTube player” wave (Saloon, Nostalgia Hits, Vadodara Garba)

**गणपती बाप्पा मोरया!**
