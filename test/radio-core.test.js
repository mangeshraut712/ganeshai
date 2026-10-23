import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  arrangeQueue,
  artworkUrl,
  classifyFetch,
  cycleRepeatMode,
  endedAction,
  filterQueue,
  formatTime,
  moveTab,
  msUntilNextMinute,
  parseFavorites,
  parseMuted,
  parseRepeatMode,
  parseVolume,
  playbackErrorDecision,
  playerReadyPlan,
  previousAction,
  sanitizeCatalog,
  shortcutAction,
  watchUrl,
} from "../radio-core.js";

const PAGE = "https://mangeshraut712.github.io";

function loadCatalog() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(new URL("../songs.js", import.meta.url), "utf8"), sandbox);
  return sanitizeCatalog(sandbox.window.GANESH_SONGS);
}

test("catalog keeps the 30 curated tracks and drops unsafe ids", () => {
  const songs = loadCatalog();
  assert.equal(songs.length, 30);
  assert.equal(songs[0].title, "Ya Re Ya");
  assert.equal(new Set(songs.map((song) => song.id)).size, 30);
  assert.ok(songs.every((song) => song.id === song.youtubeId));

  const poisoned = sanitizeCatalog([
    {
      id: "\"><img src=x onerror=alert(1)>",
      youtubeId: "javascript:alert(1)",
      title: "<script>alert(1)</script>",
      artist: "Mallory",
    },
    {
      id: "HzGE_WaSqE4",
      youtubeId: "HzGE_WaSqE4",
      title: "Ya Re Ya",
      artist: "Rohan-Rohan",
      album: "Ventilator",
    },
    {
      id: "HzGE_WaSqE4",
      youtubeId: "HzGE_WaSqE4",
      title: "Duplicate",
      artist: "Duplicate",
    },
  ]);
  assert.equal(poisoned.length, 1);
  assert.equal(poisoned[0].title, "Ya Re Ya");
});

test("artwork and watch URLs reject injected ids", () => {
  assert.equal(artworkUrl("\"><img src=x onerror=alert(1)>", "mqdefault"), "");
  assert.equal(artworkUrl("javascript:alert(1)"), "");
  assert.equal(watchUrl("javascript:alert(1)"), "https://www.youtube.com/");
  assert.equal(watchUrl("ab cd ef ghij"), "https://www.youtube.com/");
  assert.equal(
    artworkUrl("HzGE_WaSqE4", "mqdefault"),
    "https://i.ytimg.com/vi/HzGE_WaSqE4/mqdefault.jpg",
  );
  assert.equal(artworkUrl("HzGE_WaSqE4", "not-a-size"), "https://i.ytimg.com/vi/HzGE_WaSqE4/default.jpg");
  assert.equal(watchUrl("HzGE_WaSqE4"), "https://www.youtube.com/watch?v=HzGE_WaSqE4");
});

test("saved favorites ignore malformed, duplicate, and unknown ids", () => {
  const known = ["HzGE_WaSqE4", "YiiV0XWCtFw"];
  assert.deepEqual(
    parseFavorites("[\"HzGE_WaSqE4\",\"HzGE_WaSqE4\",\"nope\",{\"<img>\":1},\"<img>\",\"YiiV0XWCtFw\"]", known),
    ["HzGE_WaSqE4", "YiiV0XWCtFw"],
  );
  assert.deepEqual(parseFavorites("{", known), []);
  assert.deepEqual(parseFavorites("{\"id\":\"HzGE_WaSqE4\"}", known), []);
  assert.deepEqual(parseFavorites(null, known), []);
});

test("repeat, volume, and mute preferences fall back safely", () => {
  assert.equal(parseRepeatMode("one"), "one");
  assert.equal(parseRepeatMode("loop"), "off");
  assert.equal(cycleRepeatMode("off"), "all");
  assert.equal(cycleRepeatMode("all"), "one");
  assert.equal(cycleRepeatMode("one"), "off");
  assert.equal(parseVolume("40"), 40);
  assert.equal(parseVolume("150"), 100);
  assert.equal(parseVolume("-5"), 0);
  assert.equal(parseVolume("nope"), 100);
  assert.equal(parseMuted("true"), true);
  assert.equal(parseMuted("false"), false);
});

test("turning shuffle off restores curated order at the current song", () => {
  const songs = [
    { id: "aaaaaaaaaaa", title: "A", artist: "a" },
    { id: "bbbbbbbbbbb", title: "B", artist: "b" },
    { id: "ccccccccccc", title: "C", artist: "c" },
  ];
  const shuffled = arrangeQueue(songs, {
    shuffle: true,
    currentId: "bbbbbbbbbbb",
    random: () => 0,
  });
  assert.equal(shuffled.index, 0);
  assert.equal(songs[shuffled.order[0]].id, "bbbbbbbbbbb");
  assert.deepEqual(shuffled.order, [1, 2, 0]);

  const restored = arrangeQueue(songs, { shuffle: false, currentId: "ccccccccccc" });
  assert.deepEqual(restored.order, [0, 1, 2]);
  assert.equal(restored.index, 2);
});

test("queue filter matches title, artist, and album without dropping the playback index", () => {
  const songs = loadCatalog();
  const order = songs.map((_, index) => index);
  const byTitle = filterQueue(songs, order, { query: "ya re ya" });
  assert.deepEqual(byTitle, [0]);
  const favoritesOnly = filterQueue(songs, order, {
    tab: "favs",
    favoriteIds: [songs[4].id, "not-a-real-id"],
  });
  assert.deepEqual(favoritesOnly, [4]);
  const byAlbum = filterQueue(songs, order, { query: "ventilator" });
  assert.deepEqual(byAlbum, [0]);
});

test("natural end, previous, and player-ready races stay on the intended track", () => {
  assert.equal(endedAction({ repeatMode: "off", index: 2, length: 3 }), "stop");
  assert.equal(endedAction({ repeatMode: "off", index: 0, length: 3 }), "next");
  assert.equal(endedAction({ repeatMode: "all", index: 2, length: 3 }), "next");
  assert.equal(endedAction({ repeatMode: "one", index: 1, length: 3 }), "restart");

  assert.deepEqual(previousAction({ currentTime: 10, index: 1, length: 3 }), { type: "restart", index: 1 });
  assert.deepEqual(previousAction({ currentTime: 1, index: 0, length: 3 }), { type: "previous", index: 2 });

  assert.deepEqual(
    playerReadyPlan({ createdVideoId: "aaaaaaaaaaa", currentVideoId: "aaaaaaaaaaa", userStarted: true }),
    { action: "stay" },
  );
  assert.deepEqual(
    playerReadyPlan({ createdVideoId: "aaaaaaaaaaa", currentVideoId: "bbbbbbbbbbb", userStarted: true }),
    { action: "load", videoId: "bbbbbbbbbbb" },
  );
  assert.deepEqual(
    playerReadyPlan({ createdVideoId: "aaaaaaaaaaa", currentVideoId: "bbbbbbbbbbb", userStarted: false }),
    { action: "cue", videoId: "bbbbbbbbbbb" },
  );
});

test("a fully failing queue stops instead of skipping forever", () => {
  assert.equal(playbackErrorDecision({ consecutiveErrors: 1, queueLength: 3 }), "skip");
  assert.equal(playbackErrorDecision({ consecutiveErrors: 2, queueLength: 3 }), "skip");
  assert.equal(playbackErrorDecision({ consecutiveErrors: 3, queueLength: 3 }), "stop");
  assert.equal(playbackErrorDecision({ consecutiveErrors: 1, queueLength: 0 }), "stop");
});

test("keyboard shortcuts do not steal buttons, fields, sliders, tabs, or an open dialog", () => {
  assert.equal(shortcutAction({ key: " ", tagName: "BUTTON" }), null);
  assert.equal(shortcutAction({ key: "Enter", tagName: "A" }), null);
  assert.equal(shortcutAction({ key: " ", tagName: "IMG", role: "button" }), null);
  assert.deepEqual(shortcutAction({ key: " ", tagName: "BODY" }), { type: "toggle-play" });
  assert.equal(shortcutAction({ key: "ArrowRight", tagName: "INPUT" }), null);
  assert.equal(shortcutAction({ key: "m", role: "slider" }), null);
  assert.deepEqual(shortcutAction({ key: "ArrowRight", role: "tab" }), { type: "tab", key: "ArrowRight" });
  assert.equal(shortcutAction({ key: "b", modalOpen: true }), null);
  assert.deepEqual(shortcutAction({ key: "?", modalOpen: true }), { type: "help" });
  assert.equal(moveTab("all", "ArrowRight"), "favs");
  assert.equal(moveTab("favs", "ArrowRight"), "all");
  assert.equal(moveTab("favs", "Home"), "all");
  assert.equal(moveTab("all", "End"), "favs");
});

test("clock scheduling and time labels stay accurate", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(65), "1:05");
  assert.equal(formatTime(-4), "0:00");
  assert.equal(formatTime(Number.NaN), "0:00");
  assert.equal(msUntilNextMinute(new Date("2026-08-10T12:00:00.000Z")), 60_000);
  assert.equal(msUntilNextMinute(new Date("2026-08-10T12:00:59.500Z")), 500);
});

test("service worker bypasses third-party media and updates same-origin code from the network", () => {
  assert.equal(classifyFetch({
    requestUrl: "https://www.youtube.com/iframe_api",
    method: "GET",
    pageOrigin: PAGE,
  }), "bypass");
  assert.equal(classifyFetch({
    requestUrl: "https://i.ytimg.com/vi/HzGE_WaSqE4/hqdefault.jpg",
    method: "GET",
    pageOrigin: PAGE,
  }), "bypass");
  assert.equal(classifyFetch({
    requestUrl: "https://yt3.ggpht.com/artwork.jpg",
    method: "GET",
    pageOrigin: PAGE,
  }), "bypass");
  assert.equal(classifyFetch({
    requestUrl: "https://notyoutube.example/app.js",
    method: "GET",
    pageOrigin: PAGE,
  }), "bypass");
  assert.equal(classifyFetch({
    requestUrl: "https://mangeshraut712.github.io/ganeshai/app.js",
    method: "GET",
    pageOrigin: PAGE,
  }), "network-first");
  assert.equal(classifyFetch({
    requestUrl: "https://mangeshraut712.github.io/ganeshai/ganesh-logo.webp",
    method: "GET",
    pageOrigin: PAGE,
  }), "cache-first");
  assert.equal(classifyFetch({
    requestUrl: "https://mangeshraut712.github.io/ganeshai/app.js",
    method: "POST",
    pageOrigin: PAGE,
  }), "bypass");
  assert.equal(classifyFetch({
    requestUrl: "not a url",
    method: "GET",
    pageOrigin: PAGE,
  }), "bypass");
});
