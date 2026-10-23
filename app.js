/**
 * Ganeshotsav Radio
 * Custom UI over the official YouTube IFrame API.
 * Video is hidden; audio still streams from YouTube.
 */

import {
  arrangeQueue,
  artworkUrl,
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
} from "./radio-core.js";

(() => {
  "use strict";

  const SONGS = sanitizeCatalog(window.GANESH_SONGS);
  if (!SONGS.length) {
    console.error("No songs loaded. Check songs.js");
    return;
  }

  const storageGet = (key, fallback = null) => {
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const storageSet = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage can be unavailable in privacy-restricted contexts */
    }
  };

  const readFavorites = () => new Set(
    parseFavorites(storageGet("ganesh_favs", "[]"), SONGS.map((song) => song.id)),
  );

  // ── DOM ──────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = {
    clock: $("clock"),
    cover: $("cover"),
    title: $("title"),
    artist: $("artist"),
    fill: $("fill"),
    knob: $("knob"),
    scrub: $("scrub"),
    currentTime: $("currentTime"),
    duration: $("duration"),
    play: $("play"),
    prev: $("prev"),
    next: $("next"),
    shuffle: $("shuffle"),
    repeat: $("repeat"),
    repeatBadge: $("repeatBadge"),
    volumeControl: $("volumeControl"),
    muteBtn: $("muteBtn"),
    volSlider: $("volSlider"),
    openYt: $("openYt"),
    queueBtn: $("queueBtn"),
    queue: $("queue"),
    queueList: $("queueList"),
    queueCount: $("queueCount"),
    queueSearch: $("queueSearch"),
    searchClear: $("searchClear"),
    filterAll: $("filterAll"),
    filterFavs: $("filterFavs"),
    favCount: $("favCount"),
    queueEmpty: $("queueEmpty"),
    favBtn: $("favBtn"),
    equalizer: $("equalizer"),
    onlineCount: $("onlineCount"),
    toast: $("toast"),
    petals: $("petals"),
    bellBtn: $("bellBtn"),
    shankhBtn: $("shankhBtn"),
    helpBtn: $("helpBtn"),
    helpModal: $("helpModal"),
    closeHelpBtn: $("closeHelpBtn"),
  };

  // ── State ────────────────────────────────────
  let index = 0;
  let player = null;
  let playerPromise = null;
  let ready = false;
  let playing = false;
  let shuffleOn = false;
  let repeatMode = parseRepeatMode(storageGet("ganesh_repeat", "off"));
  let volume = parseVolume(storageGet("ganesh_volume", "100"));
  let isMuted = parseMuted(storageGet("ganesh_muted", "false"));
  let favorites = readFavorites();
  let searchQuery = "";
  let activeTab = "all"; // "all" | "favs"
  let order = SONGS.map((_, i) => i);
  let progressTimer = null;
  let dragging = false;
  let toastTimer = null;
  let skipTimer = null;
  let userStarted = false;
  let consecutiveErrors = 0;

  const START_SECONDS = 0;
  const PLAYER_READY_TIMEOUT_MS = 15_000;

  // ── Helpers ──────────────────────────────────
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function showToast(msg, ms = 2600) {
    if (!el.toast) return;
    el.toast.hidden = false;
    el.toast.textContent = msg;
    requestAnimationFrame(() => el.toast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
      setTimeout(() => {
        el.toast.hidden = true;
      }, 280);
    }, ms);
  }

  function currentSong() {
    return SONGS[order[index]];
  }

  function updateClock() {
    if (!el.clock) return;
    const now = new Date();
    el.clock.textContent = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(now);
    el.clock.dateTime = now.toISOString();
    return now;
  }

  function syncTransportLabels() {
    const song = currentSong();
    const action = playing ? "Pause" : "Play";
    const label = song ? `${action} ${song.title}` : action;
    if (el.play && el.play.getAttribute("aria-busy") !== "true") {
      el.play.setAttribute("aria-label", label);
      el.play.title = action;
    }
    if (el.cover && song) {
      el.cover.alt = `${song.title} cover art`;
      el.cover.setAttribute("aria-label", label);
    }
  }

  // ── Media Session API ────────────────────────
  function updateMediaSession(song) {
    if (!("mediaSession" in navigator) || !song) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album || "Ganeshotsav Radio",
      artwork: ["hqdefault", "maxresdefault"].flatMap((quality) => {
        const src = artworkUrl(song.youtubeId, quality);
        if (!src) return [];
        return [{
          src,
          sizes: quality === "hqdefault" ? "480x360" : "1280x720",
          type: "image/jpeg",
        }];
      }),
    });
  }

  function setupMediaSessionActions() {
    if (!("mediaSession" in navigator)) return;
    const actions = [
      ["play", () => { if (!playing) togglePlay(); }],
      ["pause", () => { if (playing) togglePlay(); }],
      ["previoustrack", () => playPrev()],
      ["nexttrack", () => playNext()],
      ["seekto", (details) => {
        if (player && typeof player.seekTo === "function" && details.seekTime !== undefined) {
          player.seekTo(details.seekTime, true);
        }
      }],
    ];

    actions.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        /* ignore unsupported actions */
      }
    });
  }

  // ── Volume & Favorites Logic ─────────────────
  function applyVolume() {
    if (el.volSlider) el.volSlider.value = String(volume);
    if (el.volumeControl) el.volumeControl.classList.toggle("is-muted", isMuted);
    if (el.muteBtn) {
      el.muteBtn.setAttribute("aria-pressed", String(isMuted));
      el.muteBtn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
    }
    if (ready && player) {
      if (isMuted) {
        player.mute();
      } else {
        player.unMute();
        player.setVolume(volume);
      }
    }
  }

  function setVolume(val) {
    volume = clamp(val, 0, 100);
    if (volume > 0 && isMuted) {
      isMuted = false;
    }
    storageSet("ganesh_volume", String(volume));
    storageSet("ganesh_muted", String(isMuted));
    applyVolume();
  }

  function toggleMute() {
    isMuted = !isMuted;
    storageSet("ganesh_muted", String(isMuted));
    applyVolume();
    showToast(isMuted ? "Audio muted" : `Volume ${volume}%`);
  }

  function updateRepeatUI() {
    if (!el.repeat) return;
    const isAll = repeatMode === "all";
    const isOne = repeatMode === "one";

    el.repeat.classList.toggle("is-active", isAll || isOne);
    el.repeat.setAttribute("aria-pressed", String(isAll || isOne));
    if (el.repeatBadge) el.repeatBadge.hidden = !isOne;
    el.repeat.setAttribute("aria-label", `Repeat mode: ${repeatMode}`);
  }

  function cycleRepeat() {
    repeatMode = cycleRepeatMode(repeatMode);
    storageSet("ganesh_repeat", repeatMode);
    updateRepeatUI();
    const msgs = { off: "Repeat off", all: "Repeat playlist on", one: "Repeat single track on" };
    showToast(msgs[repeatMode]);
  }

  function updateFavUI() {
    const song = currentSong();
    if (!song || !el.favBtn) return;
    const isFav = favorites.has(song.id);
    el.favBtn.classList.toggle("is-favorite", isFav);
    el.favBtn.setAttribute("aria-pressed", String(isFav));
    el.favBtn.setAttribute("aria-label", isFav ? "Remove from favorites" : "Add to favorites");
    if (el.favCount) el.favCount.textContent = String(favorites.size);
  }

  function toggleFavorite(songId) {
    const id = songId || currentSong()?.id;
    if (!id) return;
    if (favorites.has(id)) {
      favorites.delete(id);
      showToast("Removed from favorites");
    } else {
      favorites.add(id);
      showToast("Added to ❤️ Favorites");
    }
    storageSet("ganesh_favs", JSON.stringify(Array.from(favorites)));
    updateFavUI();
    buildQueue();
  }

  // ── UI updates ───────────────────────────────
  function updateMeta(song, { updateArtwork = true } = {}) {
    if (!song) return;
    el.title.textContent = song.title;
    el.artist.textContent = song.artist + (song.album ? ` · ${song.album}` : "");
    if (updateArtwork) {
      const coverUrl = artworkUrl(song.youtubeId);
      if (coverUrl) el.cover.src = coverUrl;
    }
    el.openYt.href = watchUrl(song.youtubeId);
    syncTransportLabels();
    document.title = `${song.title} · GaneshAI Radio`;
    updateFavUI();
    updateMediaSession(song);
    highlightQueue();
  }

  function setPlayingUI(isPlaying) {
    playing = isPlaying;
    setBufferingUI(false);
    el.play.classList.toggle("is-playing", isPlaying);
    document.body.classList.toggle("is-playing", isPlaying);
    syncTransportLabels();
  }

  function setBufferingUI(isBuffering) {
    document.body.classList.toggle("is-buffering", isBuffering);
    el.play.setAttribute("aria-busy", String(isBuffering));
    if (isBuffering) {
      el.play.dataset.buffering = "true";
      el.play.setAttribute("aria-label", "Loading playback");
    } else {
      delete el.play.dataset.buffering;
    }
  }

  function setProgress(current, duration) {
    const d = duration > 0 ? duration : 0;
    const c = clamp(current || 0, 0, d || 0);
    const pct = d ? (c / d) * 100 : 0;
    if (!dragging) {
      el.fill.style.width = `${pct}%`;
      el.knob.style.left = `${pct}%`;
      el.scrub.setAttribute("aria-valuenow", String(Math.round(pct)));
    }
    el.currentTime.textContent = formatTime(c);
    el.duration.textContent = d ? formatTime(d) : "0:00";
    el.scrub.setAttribute("aria-valuetext", `${formatTime(c)} of ${formatTime(d)}`);
  }

  function tickProgress() {
    if (!player || typeof player.getCurrentTime !== "function") return;
    try {
      const cur = player.getCurrentTime();
      const dur = player.getDuration();
      setProgress(cur, dur);
    } catch {
      /* player may be mid-load */
    }
  }

  function startProgressLoop() {
    stopProgressLoop();
    progressTimer = setInterval(tickProgress, 400);
  }

  function stopProgressLoop() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  // ── Queue ────────────────────────────────────
  function hydrateQueueImages() {
    if (!el.queueList) return;
    el.queueList.querySelectorAll("img[data-src]").forEach((img) => {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
  }

  function buildQueue() {
    if (!el.queueList) return;
    const filteredIndices = filterQueue(SONGS, order, {
      query: searchQuery,
      tab: activeTab,
      favoriteIds: favorites,
    });
    const queueVisible = el.queue && !el.queue.hidden;

    el.queueCount.textContent = `${filteredIndices.length} song${filteredIndices.length === 1 ? "" : "s"}`;
    if (el.favCount) el.favCount.textContent = String(favorites.size);
    if (el.queueEmpty) el.queueEmpty.hidden = filteredIndices.length > 0;

    const rows = filteredIndices.map((songIndex) => {
      const song = SONGS[songIndex];
      const playIndex = order.indexOf(songIndex);
      const isFav = favorites.has(song.id);

      const row = document.createElement("li");
      row.className = "queue-row";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "queue-item";
      btn.dataset.playIndex = String(playIndex);
      btn.setAttribute("aria-label", `Play ${song.title} by ${song.artist}`);

      const img = document.createElement("img");
      img.alt = "";
      img.width = 40;
      img.height = 40;
      img.loading = "lazy";
      img.decoding = "async";
      const src = artworkUrl(song.youtubeId, "mqdefault");
      if (src && queueVisible) img.src = src;
      else if (src) img.dataset.src = src;

      const meta = document.createElement("span");
      meta.className = "q-meta";
      const title = document.createElement("span");
      title.className = "q-title";
      title.textContent = song.title;
      const artist = document.createElement("span");
      artist.className = "q-artist";
      artist.textContent = song.artist;
      meta.append(title, artist);

      const fav = document.createElement("span");
      fav.className = "q-fav-tag";
      fav.setAttribute("aria-hidden", "true");
      fav.textContent = isFav ? "❤️" : "";

      const now = document.createElement("span");
      now.className = "q-now";
      now.textContent = "Now";

      const trail = document.createElement("span");
      trail.className = "q-trail";
      trail.append(fav, now);

      btn.append(img, meta, trail);
      btn.addEventListener("click", () => {
        index = playIndex;
        userStarted = true;
        consecutiveErrors = 0;
        loadAndPlay(true);
        showToast(`Playing · ${song.title}`);
      });
      row.append(btn);
      return row;
    });
    el.queueList.replaceChildren(...rows);
    highlightQueue();
  }

  function highlightQueue() {
    if (!el.queueList) return;
    const items = el.queueList.querySelectorAll(".queue-item");
    items.forEach((node) => {
      const i = Number(node.dataset.playIndex);
      const active = i === index;
      node.classList.toggle("is-active", active);
      if (active) node.setAttribute("aria-current", "true");
      else node.removeAttribute("aria-current");
    });
  }

  // ── YouTube player ───────────────────────────
  function loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
        return;
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => reject(new Error("YouTube API failed to load"));
      document.head.appendChild(script);
    });
  }

  async function createPlayer() {
    const YT = await loadYouTubeAPI();
    const song = currentSong();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("YouTube player timed out"));
      }, PLAYER_READY_TIMEOUT_MS);

      let created;
      try {
        created = new YT.Player("yt-player", {
          height: "1",
          width: "1",
          videoId: song.youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
            start: START_SECONDS,
          },
          events: {
            onReady: (event) => {
              clearTimeout(timer);
              ready = true;
              player = event.target;
              applyVolume();
              const latest = currentSong();
              const plan = playerReadyPlan({
                createdVideoId: song.youtubeId,
                currentVideoId: latest?.youtubeId,
                userStarted,
              });
              if (plan.action === "load") {
                player.loadVideoById({ videoId: plan.videoId, startSeconds: START_SECONDS });
              } else if (plan.action === "cue") {
                player.cueVideoById({ videoId: plan.videoId, startSeconds: START_SECONDS });
              }
              updateMeta(latest);
              setProgress(0, 0);
              resolve({ player, switched: plan.action !== "stay" });
            },
            onStateChange,
            onError: onPlayerError,
          },
        });
      } catch (error) {
        clearTimeout(timer);
        reject(error);
        return;
      }
      player = created;
    });
  }

  function resetPlayerMount() {
    const host = document.getElementById("yt-host");
    if (!host) return;
    host.replaceChildren();
    const mount = document.createElement("div");
    mount.id = "yt-player";
    host.append(mount);
  }

  async function ensurePlayer(autoplay = false) {
    if (ready && player) {
      if (autoplay) player.playVideo();
      return player;
    }

    if (!playerPromise) {
      setBufferingUI(true);
      playerPromise = createPlayer().catch((error) => {
        playerPromise = null;
        ready = false;
        player = null;
        resetPlayerMount();
        setBufferingUI(false);
        throw error;
      });
    }

    try {
      const result = await playerPromise;
      if (autoplay && result && !result.switched) result.player.playVideo();
      return result?.player ?? null;
    } catch (error) {
      console.error(error);
      showToast("Could not reach YouTube. Check your connection.");
      return null;
    }
  }

  function onStateChange(event) {
    const S = window.YT.PlayerState;
    switch (event.data) {
      case S.PLAYING:
        consecutiveErrors = 0;
        setPlayingUI(true);
        startProgressLoop();
        tickProgress();
        break;
      case S.PAUSED:
        setPlayingUI(false);
        stopProgressLoop();
        tickProgress();
        break;
      case S.ENDED: {
        setPlayingUI(false);
        stopProgressLoop();
        const action = endedAction({ repeatMode, index, length: order.length });
        if (action === "restart") {
          player.seekTo(0, true);
          player.playVideo();
        } else if (action === "stop") {
          showToast("End of playlist");
        } else {
          playNext(true);
        }
        break;
      }
      case S.BUFFERING:
        setBufferingUI(true);
        break;
      case S.CUED:
        setPlayingUI(false);
        break;
      default:
        break;
    }
  }

  function onPlayerError(event) {
    console.warn("YouTube error", event.data, currentSong()?.title, currentSong()?.youtubeId);
    setPlayingUI(false);
    if (skipTimer) return;
    consecutiveErrors += 1;
    const decision = playbackErrorDecision({
      consecutiveErrors,
      queueLength: order.length,
    });
    if (decision === "stop") {
      showToast("None of these tracks can play right now.");
      return;
    }
    showToast("This track can’t play here — skipping…");
    skipTimer = setTimeout(() => {
      skipTimer = null;
      playNext(true);
    }, 700);
  }

  function loadAndPlay(autoplay) {
    const song = currentSong();
    if (!song) return;
    if (skipTimer) {
      clearTimeout(skipTimer);
      skipTimer = null;
    }
    updateMeta(song);
    setProgress(0, 0);

    if (!ready || !player || typeof player.loadVideoById !== "function") {
      if (autoplay && userStarted) ensurePlayer(true);
      return;
    }
    setBufferingUI(false);

    const payload = { videoId: song.youtubeId, startSeconds: START_SECONDS };
    try {
      if (autoplay && userStarted) {
        player.loadVideoById(payload);
      } else {
        player.cueVideoById(payload);
      }
    } catch (err) {
      console.error(err);
      showToast("Could not load track from YouTube");
    }
  }

  function togglePlay() {
    if (!ready || !player) {
      userStarted = true;
      updateMeta(currentSong());
      showToast("Connecting to YouTube…");
      ensurePlayer(true);
      return;
    }
    userStarted = true;
    const state = player.getPlayerState?.();
    const S = window.YT.PlayerState;
    if (state === S.PLAYING || state === S.BUFFERING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  function playNext(fromEnded = false) {
    if (!fromEnded) consecutiveErrors = 0;
    index = (index + 1) % order.length;
    userStarted = true;
    loadAndPlay(true);
  }

  function playPrev() {
    let currentTime = 0;
    try {
      currentTime = player?.getCurrentTime?.() || 0;
    } catch {
      currentTime = 0;
    }
    consecutiveErrors = 0;
    const action = previousAction({ currentTime, index, length: order.length });
    if (action.type === "restart" && player && typeof player.seekTo === "function") {
      player.seekTo(0, true);
      setProgress(0, player.getDuration?.() || 0);
      return;
    }
    index = action.index;
    userStarted = true;
    loadAndPlay(true);
  }

  // ── Scrubbing ────────────────────────────────
  function fractionFromEvent(e) {
    const rect = el.scrub.querySelector(".track").getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }

  function seekToFraction(frac) {
    if (!player || typeof player.getDuration !== "function") return;
    const dur = player.getDuration();
    if (!dur || !isFinite(dur)) return;
    const t = dur * frac;
    player.seekTo(t, true);
    setProgress(t, dur);
  }

  function onScrubStart(e) {
    if (!ready) return;
    dragging = true;
    el.scrub.classList.add("is-dragging");
    const frac = fractionFromEvent(e);
    el.fill.style.width = `${frac * 100}%`;
    el.knob.style.left = `${frac * 100}%`;
    e.preventDefault();
  }

  function onScrubMove(e) {
    if (!dragging) return;
    const frac = fractionFromEvent(e);
    el.fill.style.width = `${frac * 100}%`;
    el.knob.style.left = `${frac * 100}%`;
  }

  function onScrubEnd(e) {
    if (!dragging) return;
    dragging = false;
    el.scrub.classList.remove("is-dragging");
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const frac = fractionFromEvent(point);
    seekToFraction(frac);
  }

  function onScrubKey(e) {
    if (!ready || !player) return;
    const duration = player.getDuration?.() || 0;
    if (!duration) return;

    const current = player.getCurrentTime?.() || 0;
    let next = current;
    if (e.key === "ArrowLeft") next -= 5;
    else if (e.key === "ArrowRight") next += 5;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = duration;
    else return;

    e.preventDefault();
    seekToFraction(clamp(next / duration, 0, 1));
  }

  // ── Decorative bits ──────────────────────────
  function spawnPetals(count = 18) {
    if (!el.petals) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const petals = [];
    for (let i = 0; i < count; i += 1) {
      const petal = document.createElement("span");
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${10 + Math.random() * 14}s`;
      petal.style.animationDelay = `${-Math.random() * 16}s`;
      petal.style.opacity = String(0.25 + Math.random() * 0.4);
      petal.style.transform = `scale(${0.6 + Math.random() * 0.9})`;
      petals.push(petal);
    }
    el.petals.replaceChildren(...petals);
  }

  // ── Mandap Ambient Audio Effects (Web Audio API) ──
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function ringBell() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [1046.5, 2093, 3135.96, 4186];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      const vol = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.6);
    });
    showToast("🔔 Mandap Bell Chime");
  }

  function soundShankh() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(330, now + 0.6);
    osc.frequency.linearRampToValueAtTime(311, now + 2.2);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(850, now + 0.8);
    filter.frequency.linearRampToValueAtTime(450, now + 2.2);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.6);
    showToast("🐚 Sacred Shankh Naad");
  }

  function toggleHelpModal() {
    if (!el.helpModal) return;
    if (el.helpModal.open) {
      el.helpModal.close();
    } else {
      el.helpModal.showModal();
    }
  }

  function fakePresence() {
    const base = 12 + Math.floor(Math.random() * 40);
    const tick = () => {
      if (document.hidden) return;
      const n = clamp(base + Math.floor(Math.random() * 9) - 4, 3, 99);
      if (el.onlineCount) el.onlineCount.textContent = String(n);
    };
    tick();
    setInterval(tick, 8000 + Math.random() * 6000);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    const register = () => {
      navigator.serviceWorker.register("./sw.js", { type: "module" }).catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }

  // ── Keyboard ─────────────────────────────────
  function onKey(e) {
    const action = shortcutAction({
      key: e.key,
      tagName: e.target?.tagName,
      role: e.target?.getAttribute?.("role") || "",
      modalOpen: Boolean(el.helpModal?.open),
      editable: Boolean(e.target?.isContentEditable),
    });
    if (!action) return;

    if (action.type === "tab") {
      e.preventDefault();
      selectTab(moveTab(activeTab, action.key), { focus: true });
      return;
    }

    switch (action.type) {
      case "toggle-play":
        e.preventDefault();
        togglePlay();
        break;
      case "next":
        playNext();
        break;
      case "prev":
        playPrev();
        break;
      case "mute":
        toggleMute();
        break;
      case "repeat":
        cycleRepeat();
        break;
      case "shuffle":
        el.shuffle?.click();
        break;
      case "favorite":
        toggleFavorite();
        break;
      case "bell":
        ringBell();
        break;
      case "shankh":
        soundShankh();
        break;
      case "help":
        e.preventDefault();
        toggleHelpModal();
        break;
      default:
        break;
    }
  }

  function selectTab(tab, { focus = false } = {}) {
    activeTab = tab === "favs" ? "favs" : "all";
    const tabs = [
      [el.filterAll, "all"],
      [el.filterFavs, "favs"],
    ];
    tabs.forEach(([node, name]) => {
      if (!node) return;
      const selected = name === activeTab;
      node.classList.toggle("is-active", selected);
      node.setAttribute("aria-selected", String(selected));
      node.tabIndex = selected ? 0 : -1;
      if (selected && focus) node.focus();
    });
    if (el.queueList) {
      el.queueList.setAttribute("aria-labelledby", activeTab === "favs" ? "filterFavs" : "filterAll");
    }
    buildQueue();
  }

  // ── Wire events ──────────────────────────────
  function bind() {
    el.play.addEventListener("click", togglePlay);
    el.next.addEventListener("click", () => {
      userStarted = true;
      playNext();
    });
    el.prev.addEventListener("click", () => {
      userStarted = true;
      playPrev();
    });

    el.shuffle.addEventListener("click", () => {
      shuffleOn = !shuffleOn;
      el.shuffle.setAttribute("aria-pressed", String(shuffleOn));
      el.shuffle.setAttribute("aria-label", shuffleOn ? "Turn shuffle off" : "Turn shuffle on");
      const arranged = arrangeQueue(SONGS, { shuffle: shuffleOn, currentId: currentSong()?.id });
      order = arranged.order;
      index = arranged.index;
      buildQueue();
      showToast(shuffleOn ? "Shuffle on · मोरया!" : "Shuffle off");
    });

    if (el.repeat) {
      el.repeat.addEventListener("click", cycleRepeat);
    }

    if (el.muteBtn) {
      el.muteBtn.addEventListener("click", toggleMute);
    }

    if (el.volSlider) {
      el.volSlider.addEventListener("input", (e) => {
        setVolume(parseVolume(e.target.value));
      });
    }

    if (el.favBtn) {
      el.favBtn.addEventListener("click", () => toggleFavorite());
    }

    if (el.queueSearch) {
      el.queueSearch.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        if (el.searchClear) el.searchClear.hidden = !searchQuery;
        buildQueue();
      });
    }

    if (el.searchClear) {
      el.searchClear.addEventListener("click", () => {
        searchQuery = "";
        if (el.queueSearch) el.queueSearch.value = "";
        el.searchClear.hidden = true;
        buildQueue();
      });
    }

    if (el.filterAll) el.filterAll.addEventListener("click", () => selectTab("all"));
    if (el.filterFavs) el.filterFavs.addEventListener("click", () => selectTab("favs"));

    el.queueBtn.addEventListener("click", () => {
      const open = el.queue.hidden;
      el.queue.hidden = !open;
      el.queueBtn.setAttribute("aria-expanded", String(open));
      el.queueBtn.setAttribute("aria-label", open ? "Hide playlist" : "Show playlist");
      el.queueBtn.title = open ? "Hide playlist" : "Show playlist";
      document.body.classList.toggle("queue-open", open);
      if (open) hydrateQueueImages();
    });

    el.scrub.addEventListener("pointerdown", onScrubStart);
    el.scrub.addEventListener("keydown", onScrubKey);
    window.addEventListener("pointermove", onScrubMove);
    window.addEventListener("pointerup", onScrubEnd);
    window.addEventListener("pointercancel", onScrubEnd);
    window.addEventListener("keydown", onKey);

    el.cover.addEventListener("click", togglePlay);
    el.cover.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      togglePlay();
    });
    el.cover.addEventListener("error", () => {
      el.cover.classList.add("is-missing");
    });
    el.cover.addEventListener("load", () => {
      el.cover.classList.remove("is-missing");
    });
    el.cover.style.cursor = "pointer";

    if (el.bellBtn) {
      el.bellBtn.addEventListener("click", ringBell);
    }
    if (el.shankhBtn) {
      el.shankhBtn.addEventListener("click", soundShankh);
    }
    if (el.helpBtn) {
      el.helpBtn.addEventListener("click", toggleHelpModal);
    }
    if (el.closeHelpBtn) {
      el.closeHelpBtn.addEventListener("click", () => {
        if (el.helpModal) el.helpModal.close();
      });
    }

    setupMediaSessionActions();
    updateRepeatUI();
    applyVolume();
  }

  // ── Boot ─────────────────────────────────────
  function scheduleClock() {
    const now = updateClock() || new Date();
    window.setTimeout(scheduleClock, msUntilNextMinute(now));
  }

  async function init() {
    scheduleClock();
    order = SONGS.map((_, songIndex) => songIndex);
    index = 0;
    storageSet("ganesh_favs", JSON.stringify(Array.from(favorites)));
    updateMeta(currentSong(), { updateArtwork: false });
    bind();
    buildQueue();
    registerServiceWorker();

    const startDecorations = () => {
      const run = () => {
        spawnPetals();
        fakePresence();
      };
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 2000 });
      } else {
        window.setTimeout(run, 1200);
      }
    };
    if (document.readyState === "complete") startDecorations();
    else window.addEventListener("load", startDecorations, { once: true });

    /* YouTube is intentionally loaded on first interaction to keep startup fast. */
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
