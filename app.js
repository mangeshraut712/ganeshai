/**
 * Ganeshotsav Radio
 * Custom UI over the official YouTube IFrame API.
 * Video is hidden; audio still streams from YouTube.
 */

(() => {
  "use strict";

  const SONGS = Array.isArray(window.GANESH_SONGS) ? window.GANESH_SONGS.slice() : [];
  if (!SONGS.length) {
    console.error("No songs loaded. Check songs.js");
    return;
  }

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
    openYt: $("openYt"),
    queueBtn: $("queueBtn"),
    queue: $("queue"),
    queueList: $("queueList"),
    queueCount: $("queueCount"),
    onlineCount: $("onlineCount"),
    toast: $("toast"),
    petals: $("petals"),
  };

  // ── State ────────────────────────────────────
  let index = 0;
  let player = null;
  let ready = false;
  let playing = false;
  let shuffleOn = false;
  let order = SONGS.map((_, i) => i);
  let progressTimer = null;
  let dragging = false;
  let toastTimer = null;
  let skipTimer = null;
  let userStarted = false;

  // Skip quiet intros on some aartis a bit — still starts near beginning
  const START_SECONDS = 0;

  // ── Helpers ──────────────────────────────────
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };
  const thumb = (id, quality = "hqdefault") =>
    `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
  const ytWatch = (id) => `https://www.youtube.com/watch?v=${id}`;

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
  }

  function reshuffle(keepCurrent = true) {
    const currentId = currentSong()?.id;
    order = SONGS.map((_, i) => i);
    if (shuffleOn) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    if (keepCurrent && currentId) {
      const at = order.findIndex((i) => SONGS[i].id === currentId);
      if (at > 0) {
        order.splice(at, 1);
        order.unshift(SONGS.findIndex((s) => s.id === currentId));
        index = 0;
      }
    }
  }

  // ── UI updates ───────────────────────────────
  function updateMeta(song) {
    if (!song) return;
    el.title.textContent = song.title;
    el.artist.textContent = song.artist + (song.album ? ` · ${song.album}` : "");
    el.cover.src = thumb(song.youtubeId);
    el.cover.alt = `${song.title} cover art`;
    el.openYt.href = ytWatch(song.youtubeId);
    document.title = `${song.title} · GaneshAI Radio`;
    highlightQueue();
  }

  function setPlayingUI(isPlaying) {
    playing = isPlaying;
    setBufferingUI(false);
    el.play.classList.toggle("is-playing", isPlaying);
    el.play.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    el.play.title = isPlaying ? "Pause" : "Play";
    document.body.classList.toggle("is-playing", isPlaying);
  }

  function setBufferingUI(isBuffering) {
    document.body.classList.toggle("is-buffering", isBuffering);
    el.play.setAttribute("aria-busy", String(isBuffering));
    if (isBuffering) {
      el.play.dataset.buffering = "true";
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
    el.currentTime.textContent = fmt(c);
    el.duration.textContent = d ? fmt(d) : "0:00";
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
  function buildQueue() {
    el.queueList.innerHTML = "";
    el.queueCount.textContent = `${SONGS.length} songs`;

    order.forEach((songIndex, playIndex) => {
      const song = SONGS[songIndex];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "queue-item";
      btn.dataset.playIndex = String(playIndex);
      btn.innerHTML = `
        <img src="${thumb(song.youtubeId, "mqdefault")}" alt="" loading="lazy" width="40" height="40" />
        <span class="q-meta">
          <span class="q-title"></span>
          <span class="q-artist"></span>
        </span>
        <span class="q-now">Now</span>
      `;
      btn.querySelector(".q-title").textContent = song.title;
      btn.querySelector(".q-artist").textContent = song.artist;
      btn.addEventListener("click", () => {
        index = playIndex;
        loadAndPlay(true);
        showToast(`Playing · ${song.title}`);
      });
      el.queueList.appendChild(btn);
    });
    highlightQueue();
  }

  function highlightQueue() {
    const items = el.queueList.querySelectorAll(".queue-item");
    items.forEach((node) => {
      const i = Number(node.dataset.playIndex);
      node.classList.toggle("is-active", i === index);
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

    return new Promise((resolve) => {
      player = new YT.Player("yt-player", {
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
          onReady: (e) => {
            ready = true;
            try {
              e.target.setVolume(100);
            } catch {
              /* ignore */
            }
            updateMeta(song);
            setProgress(0, 0);
            resolve(player);
          },
          onStateChange: onStateChange,
          onError: onPlayerError,
        },
      });
    });
  }

  function onStateChange(event) {
    const S = window.YT.PlayerState;
    switch (event.data) {
      case S.PLAYING:
        setPlayingUI(true);
        startProgressLoop();
        tickProgress();
        break;
      case S.PAUSED:
        setPlayingUI(false);
        stopProgressLoop();
        tickProgress();
        break;
      case S.ENDED:
        setPlayingUI(false);
        stopProgressLoop();
        playNext(true);
        break;
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
    // 2=invalid id, 5=html5, 100=not found, 101/150=embed not allowed
    console.warn("YouTube error", event.data);
    setPlayingUI(false);
    if (skipTimer) return;
    showToast("This track can’t play here — skipping…");
    skipTimer = setTimeout(() => {
      skipTimer = null;
      playNext(true);
    }, 700);
  }

  function loadAndPlay(autoplay) {
    const song = currentSong();
    if (!song || !player) return;
    if (skipTimer) {
      clearTimeout(skipTimer);
      skipTimer = null;
    }
    setBufferingUI(false);
    updateMeta(song);
    setProgress(0, 0);

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
      showToast("Connecting to YouTube…");
      return;
    }
    userStarted = true;
    const state = player.getPlayerState?.();
    const S = window.YT.PlayerState;
    if (state === S.PLAYING || state === S.BUFFERING) {
      player.pauseVideo();
    } else {
      player.playVideo();
      // Browsers may block autoplay until a gesture — we already have one
    }
  }

  function playNext(fromEnded = false) {
    index = (index + 1) % order.length;
    userStarted = userStarted || fromEnded;
    loadAndPlay(true);
  }

  function playPrev() {
    // Restart if >3s in, else previous
    try {
      const t = player?.getCurrentTime?.() || 0;
      if (t > 3) {
        player.seekTo(0, true);
        setProgress(0, player.getDuration?.() || 0);
        return;
      }
    } catch {
      /* ignore */
    }
    index = (index - 1 + order.length) % order.length;
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

  // ── Decorative bits ──────────────────────────
  function spawnPetals(count = 18) {
    if (!el.petals) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    el.petals.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.style.left = `${Math.random() * 100}%`;
      s.style.animationDuration = `${10 + Math.random() * 14}s`;
      s.style.animationDelay = `${-Math.random() * 16}s`;
      s.style.opacity = String(0.25 + Math.random() * 0.4);
      s.style.transform = `scale(${0.6 + Math.random() * 0.9})`;
      el.petals.appendChild(s);
    }
  }

  function fakePresence() {
    // Decorative only — same vibe as saloon/garba online counters
    const base = 12 + Math.floor(Math.random() * 40);
    const tick = () => {
      const n = clamp(base + Math.floor(Math.random() * 9) - 4, 3, 99);
      el.onlineCount.textContent = String(n);
    };
    tick();
    setInterval(tick, 8000 + Math.random() * 6000);
  }

  // ── Keyboard ─────────────────────────────────
  function onKey(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    switch (e.key) {
      case " ":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        playNext();
        break;
      case "ArrowLeft":
        playPrev();
        break;
      default:
        break;
    }
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
      reshuffle(true);
      buildQueue();
      showToast(shuffleOn ? "Shuffle on · मोरया!" : "Shuffle off");
    });

    el.queueBtn.addEventListener("click", () => {
      const open = el.queue.hidden;
      el.queue.hidden = !open;
      el.queueBtn.setAttribute("aria-expanded", String(open));
    });

    el.scrub.addEventListener("pointerdown", onScrubStart);
    window.addEventListener("pointermove", onScrubMove);
    window.addEventListener("pointerup", onScrubEnd);
    window.addEventListener("pointercancel", onScrubEnd);
    window.addEventListener("keydown", onKey);

    // Click cover to play/pause
    el.cover.addEventListener("click", togglePlay);
    el.cover.addEventListener("error", () => {
      el.cover.classList.add("is-missing");
    });
    el.cover.addEventListener("load", () => {
      el.cover.classList.remove("is-missing");
    });
    el.cover.style.cursor = "pointer";
  }

  // ── Boot ─────────────────────────────────────
  async function init() {
    updateClock();
    setInterval(updateClock, 60_000);
    spawnPetals();
    fakePresence();
    reshuffle(false);
    // Open on the requested festival opener; users can still shuffle from the controls.
    index = 0;
    buildQueue();
    updateMeta(currentSong());
    bind();

    try {
      await createPlayer();
      showToast("YouTube ready · tap play · गणपती बाप्पा मोरया", 3200);
    } catch (err) {
      console.error(err);
      showToast("Could not reach YouTube. Check your connection.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
