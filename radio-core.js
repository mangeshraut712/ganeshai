/**
 * Pure playback, catalog, and caching rules for Ganeshotsav Radio.
 * Shared by the page, the service worker, and the node test suite.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const ARTWORK_QUALITIES = new Set(["default", "mqdefault", "hqdefault", "sddefault", "maxresdefault"]);
const TABS = ["all", "favs"];

export const CACHE_NAME = "ganesh-ai-v3";

export const SHELL_ASSETS = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./radio-core.js",
  "./songs.js",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./ganesh-background.webp",
  "./ganesh-background-mobile.webp",
  "./ganesh-logo.webp",
  "./manifest.webmanifest",
];

export function isYouTubeId(id) {
  return typeof id === "string" && YOUTUBE_ID.test(id);
}

export function sanitizeCatalog(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const songs = [];
  for (const song of input) {
    if (!song || typeof song !== "object") continue;
    if (typeof song.title !== "string" || song.title.trim() === "") continue;
    if (typeof song.artist !== "string" || song.artist.trim() === "") continue;
    const youtubeId = isYouTubeId(song.youtubeId)
      ? song.youtubeId
      : (isYouTubeId(song.id) ? song.id : "");
    const id = isYouTubeId(song.id) ? song.id : youtubeId;
    if (!id || !youtubeId || seen.has(id)) continue;
    seen.add(id);
    songs.push({
      id,
      youtubeId,
      title: song.title,
      artist: song.artist,
      album: typeof song.album === "string" ? song.album : "",
    });
  }
  return songs;
}

export function artworkUrl(id, quality = "default") {
  if (!isYouTubeId(id)) return "";
  const safeQuality = ARTWORK_QUALITIES.has(quality) ? quality : "default";
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${safeQuality}.jpg`;
}

export function watchUrl(id) {
  if (!isYouTubeId(id)) return "https://www.youtube.com/";
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", id);
  return url.toString();
}

export function parseFavorites(raw, knownIds) {
  let parsed;
  try {
    parsed = JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const known = knownIds ? new Set(knownIds) : null;
  const seen = new Set();
  const ids = [];
  for (const id of parsed) {
    if (!isYouTubeId(id) || seen.has(id)) continue;
    if (known && !known.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function parseRepeatMode(value) {
  return value === "all" || value === "one" || value === "off" ? value : "off";
}

export function cycleRepeatMode(mode) {
  if (mode === "off") return "all";
  if (mode === "all") return "one";
  return "off";
}

export function parseVolume(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(100, Math.max(0, parsed));
}

export function parseMuted(value) {
  return value === "true";
}

export function formatTime(seconds) {
  const safe = Number.isFinite(seconds) ? seconds : 0;
  const whole = Math.max(0, Math.floor(safe));
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function msUntilNextMinute(date) {
  const ms = (60 - date.getSeconds()) * 1000 - date.getMilliseconds();
  return ms > 0 ? ms : 60_000;
}

export function arrangeQueue(songs, { shuffle = false, currentId = null, random = Math.random } = {}) {
  const order = songs.map((_, songIndex) => songIndex);
  if (!shuffle) {
    if (currentId == null) return { order, index: 0 };
    const found = songs.findIndex((song) => song.id === currentId);
    return { order, index: found >= 0 ? found : 0 };
  }

  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }

  if (currentId != null) {
    const at = order.findIndex((songIndex) => songs[songIndex]?.id === currentId);
    if (at > 0) {
      const [item] = order.splice(at, 1);
      order.unshift(item);
    }
  }
  return { order, index: 0 };
}

export function filterQueue(songs, order, { query = "", tab = "all", favoriteIds = [] } = {}) {
  const favorites = favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds);
  const needle = String(query).trim().toLowerCase();
  return order.filter((songIndex) => {
    const song = songs[songIndex];
    if (!song) return false;
    if (tab === "favs" && !favorites.has(song.id)) return false;
    if (!needle) return true;
    return [song.title, song.artist, song.album].some((part) => String(part || "").toLowerCase().includes(needle));
  });
}

export function endedAction({ repeatMode, index, length }) {
  if (length <= 0) return "stop";
  if (repeatMode === "one") return "restart";
  if (repeatMode === "off" && index >= length - 1) return "stop";
  return "next";
}

export function previousAction({ currentTime, index, length, threshold = 3 }) {
  if (length <= 0) return { type: "restart", index: 0 };
  if (Number(currentTime) > threshold) return { type: "restart", index };
  return { type: "previous", index: (index - 1 + length) % length };
}

export function playbackErrorDecision({ consecutiveErrors, queueLength }) {
  if (queueLength <= 0 || consecutiveErrors >= queueLength) return "stop";
  return "skip";
}

export function playerReadyPlan({ createdVideoId, currentVideoId, userStarted }) {
  if (!currentVideoId || createdVideoId === currentVideoId) return { action: "stay" };
  return { action: userStarted ? "load" : "cue", videoId: currentVideoId };
}

export function moveTab(current, key) {
  const index = Math.max(0, TABS.indexOf(current));
  if (key === "Home") return TABS[0];
  if (key === "End") return TABS[TABS.length - 1];
  if (key === "ArrowRight") return TABS[(index + 1) % TABS.length];
  if (key === "ArrowLeft") return TABS[(index - 1 + TABS.length) % TABS.length];
  return TABS[index];
}

export function shortcutAction({
  key,
  tagName = "",
  role = "",
  modalOpen = false,
  editable = false,
}) {
  const tag = String(tagName).toLowerCase();
  const widget = String(role).toLowerCase();
  if (editable) return null;
  if (tag === "input" || tag === "textarea" || tag === "select") return null;
  if (widget === "slider") return null;
  if (modalOpen && key !== "?") return null;
  if ((tag === "button" || tag === "a" || widget === "button") && (key === " " || key === "Enter")) {
    return null;
  }
  if (widget === "tab" && (key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End")) {
    return { type: "tab", key };
  }

  switch (key) {
    case " ":
      return { type: "toggle-play" };
    case "ArrowRight":
      return { type: "next" };
    case "ArrowLeft":
      return { type: "prev" };
    case "m":
    case "M":
      return { type: "mute" };
    case "r":
    case "R":
      return { type: "repeat" };
    case "s":
    case "S":
      return { type: "shuffle" };
    case "f":
    case "F":
      return { type: "favorite" };
    case "b":
    case "B":
      return { type: "bell" };
    case "k":
    case "K":
      return { type: "shankh" };
    case "?":
      return { type: "help" };
    default:
      return null;
  }
}

/**
 * Decide how the service worker should treat a request.
 * Cross-origin media (YouTube, thumbnails, googlevideo, ggpht) must not be intercepted.
 */
export function classifyFetch({ requestUrl, method, pageOrigin }) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return "bypass";
  }
  if (method !== "GET") return "bypass";
  if (url.protocol !== "https:" && url.protocol !== "http:") return "bypass";
  if (url.origin !== pageOrigin) return "bypass";
  if (/\.(?:png|webp|jpe?g|gif|svg|ico)$/i.test(url.pathname)) return "cache-first";
  return "network-first";
}
