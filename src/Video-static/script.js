/* ── Data ── */
const data = document.getElementById("data");
const streamUrl = data?.dataset.streamUrl || "";
const initialTitle = data?.dataset.title || "Video";
const initialChannel = data?.dataset.channel || "";
const apiBase = data?.dataset.apiBase || "http://127.0.0.1:5000";
const videoId = data?.dataset.videoId || "";
const description = data?.dataset.description || "";
const views = parseInt(data?.dataset.views || "0", 10);
const thumbnail = data?.dataset.thumbnail || "";
const bestAudioUrl = data?.dataset.bestAudioUrl || "";

/* ── DOM ── */
const player = document.getElementById("player");
const audioPlayer = document.getElementById("audio-player");
const playBtn = document.getElementById("play-btn");
const muteBtn = document.getElementById("mute-btn");
const volumeSlider = document.getElementById("volume");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const qualitySelect = document.getElementById("quality-select");
const pipBtn = document.getElementById("pip-btn");
const fsBtn = document.getElementById("fullscreen-btn");
const controls = document.getElementById("controls");
const progressWrap = document.getElementById("progress-wrap");
const progressPlayed = document.getElementById("progress-bar");
const progressBuffer = document.getElementById("progress-buffer");
const progressThumb = document.getElementById("progress-thumb");
const overlay = document.getElementById("player-overlay");
const titleEl = document.getElementById("title");
const channelEl = document.getElementById("channel");
const viewsDisplay = document.getElementById("views-display");
const descSection = document.getElementById("desc-section");
const descHeader = document.getElementById("desc-header");
const descContent = document.getElementById("desc-content");
const openYtBtn = document.getElementById("open-yt-btn");
const infoBtn = document.getElementById("info-btn");
const infoDrawer = document.getElementById("info-drawer");
const drawerHandle = document.getElementById("drawer-handle");

/* ── State ── */
let dualTrack = false;
let userVolume = 1;
let userMuted = false;
let drawerOpen = false;

/* ── Init ── */
document.title = "Playing: " + initialTitle;
titleEl.textContent = initialTitle;
channelEl.textContent = initialChannel;
if (views > 0) viewsDisplay.textContent = fmtViews(views) + " views";
if (streamUrl) player.src = streamUrl;
if (videoId) {
  openYtBtn.addEventListener("click", () => {
    window.open("https://youtube.com/watch?v=" + videoId, "_blank");
  });
}

/* ── Description formatting ── */
function formatDescription(text) {
  if (!text) return "";
  let s = text;
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/(^|[\s>])(#\w+)/g, '$1<span class="desc-hashtag">$2</span>');
  s = s.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^/])(https?:\/\/[^\s<]+)/g, '$1<a class="desc-link" href="$2" target="_blank" rel="noopener">$2</a>');
  s = s.replace(/(^|\s)([\d]{1,2}:[\d]{2}(?::[\d]{2})?)(?=\s|$|[.,!?])/gm, '$1<span class="desc-timestamp">$2</span>');
  s = s.replace(/--/g, '<hr class="desc-hr">');
  return s;
}

if (description) {
  descContent.innerHTML = formatDescription(description);

  descContent.querySelectorAll(".desc-timestamp").forEach((el) => {
    el.addEventListener("click", () => {
      const parts = el.textContent.split(":").map(Number);
      let seconds = 0;
      if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else seconds = parts[0] * 60 + parts[1];
      if (player.duration) player.currentTime = Math.min(seconds, player.duration);
      if (player.paused) player.play().catch(() => {});
    });
  });

  descContent.querySelectorAll(".desc-hashtag").forEach((el) => {
    el.addEventListener("click", () => {
      const tag = el.textContent.replace("#", "");
      window.open(apiUrl("/api/search?q=" + encodeURIComponent(tag)), "_blank");
    });
  });

  requestAnimationFrame(() => {
    if (descContent.scrollHeight > 200) {
      descContent.style.maxHeight = "200px";
    } else {
      descContent.style.maxHeight = "none";
    }
  });
} else {
  descSection.style.display = "none";
}

let descExpanded = descContent.style.maxHeight === "none";
descHeader.addEventListener("click", () => {
  descExpanded = !descExpanded;
  if (descExpanded) {
    descSection.classList.remove("collapsed");
    descContent.style.maxHeight = "none";
  } else {
    descContent.style.maxHeight = descContent.scrollHeight + "px";
    requestAnimationFrame(() => descSection.classList.add("collapsed"));
  }
});
if (descContent.style.maxHeight !== "none") {
  descSection.classList.add("collapsed");
  descExpanded = false;
}

/* ── Info drawer toggle ── */
function toggleDrawer() {
  drawerOpen = !drawerOpen;
  infoDrawer.classList.toggle("open", drawerOpen);
  const icon = infoBtn.querySelector("i");
  icon.className = drawerOpen ? "bi bi-chevron-down" : "bi bi-chevron-down";
}

infoBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDrawer();
});

drawerHandle.addEventListener("click", () => {
  if (drawerOpen) toggleDrawer();
});

/* ── Helpers ── */
function fmt(t) {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function fmtViews(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function apiUrl(path) { return apiBase + path; }
function apiFetch(path) { return fetch(apiUrl(path)).then((r) => r.json()); }
function showLoading() { overlay.classList.add("visible"); }
function hideLoading() { overlay.classList.remove("visible"); }

/* ── Audio sync ── */
function syncAudio() {
  if (!dualTrack || !audioPlayer.src) return;
  const diff = Math.abs(player.currentTime - audioPlayer.currentTime);
  if (diff > 0.3) audioPlayer.currentTime = player.currentTime;
}

function applyVolume() {
  if (dualTrack) {
    player.muted = true;
    audioPlayer.muted = userMuted;
    audioPlayer.volume = userVolume;
  } else {
    player.muted = userMuted;
    player.volume = userVolume;
    audioPlayer.pause();
  }
  updateVolumeIcon();
}

/* ── Play/Pause ── */
function togglePlay() {
  if (player.paused) {
    player.play().catch(() => {});
    if (dualTrack && audioPlayer.src) audioPlayer.play().catch(() => {});
  } else {
    player.pause();
    audioPlayer.pause();
  }
}

function updatePlayIcon() {
  playBtn.innerHTML = player.paused
    ? '<i class="bi bi-play-fill"></i>'
    : '<i class="bi bi-pause-fill"></i>';
}

playBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePlay(); });
player.addEventListener("click", togglePlay);

player.addEventListener("play", () => {
  updatePlayIcon();
  if (dualTrack && audioPlayer.src && audioPlayer.paused) {
    audioPlayer.currentTime = player.currentTime;
    audioPlayer.play().catch(() => {});
  }
  showControls();
});

player.addEventListener("pause", () => {
  updatePlayIcon();
  if (dualTrack && !audioPlayer.paused) audioPlayer.pause();
  clearTimeout(hideTimer);
  controls.classList.remove("hidden");
});

player.addEventListener("ended", () => {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  updatePlayIcon();
});

/* ── Loading state ── */
player.addEventListener("waiting", showLoading);
player.addEventListener("canplay", hideLoading);
player.addEventListener("playing", hideLoading);

/* ── Time & Progress ── */
player.addEventListener("timeupdate", () => {
  if (!player.duration) return;
  const pct = (player.currentTime / player.duration) * 100;
  progressPlayed.style.width = pct + "%";
  progressThumb.style.left = pct + "%";
  currentTimeEl.textContent = fmt(player.currentTime);
  syncAudio();
});

player.addEventListener("loadedmetadata", () => {
  durationEl.textContent = fmt(player.duration);
});

player.addEventListener("progress", () => {
  if (player.buffered.length > 0 && player.duration) {
    const buf = player.buffered.end(player.buffered.length - 1);
    progressBuffer.style.width = (buf / player.duration) * 100 + "%";
  }
});

function seekTo(e) {
  const rect = progressWrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (player.duration) {
    player.currentTime = pct * player.duration;
    if (dualTrack) audioPlayer.currentTime = player.currentTime;
  }
}

let seeking = false;
progressWrap.addEventListener("mousedown", (e) => { seeking = true; seekTo(e); });
document.addEventListener("mousemove", (e) => { if (seeking) seekTo(e); });
document.addEventListener("mouseup", () => { seeking = false; });

/* ── Volume ── */
function updateVolumeIcon() {
  const vol = dualTrack ? userVolume : player.volume;
  const muted = dualTrack ? userMuted : player.muted;
  let icon = "bi-volume-up-fill";
  if (muted || vol === 0) icon = "bi-volume-mute-fill";
  else if (vol < 0.5) icon = "bi-volume-down-fill";
  muteBtn.innerHTML = '<i class="bi ' + icon + '"></i>';
}

muteBtn.addEventListener("click", () => {
  userMuted = !userMuted;
  applyVolume();
});

volumeSlider.addEventListener("input", () => {
  userVolume = parseFloat(volumeSlider.value);
  userMuted = false;
  applyVolume();
});

player.addEventListener("volumechange", () => {
  if (!dualTrack) {
    userVolume = player.volume;
    userMuted = player.muted;
    volumeSlider.value = userVolume;
    updateVolumeIcon();
  }
});

/* ── Fullscreen ── */
fsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});

/* ── Miniplayer (PiP) ── */
pipBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.pictureInPictureElement) document.exitPictureInPicture();
  else player.requestPictureInPicture().catch(() => {});
});

/* ── Auto-hide controls ── */
let hideTimer = null;

function showControls() {
  controls.classList.remove("hidden");
  clearTimeout(hideTimer);
  if (!player.paused) {
    hideTimer = setTimeout(() => controls.classList.add("hidden"), 3000);
  }
}

const playerWrap = document.getElementById("player-wrap");
playerWrap.addEventListener("mousemove", showControls);
playerWrap.addEventListener("mouseenter", showControls);
playerWrap.addEventListener("mouseleave", () => {
  if (!player.paused) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => controls.classList.add("hidden"), 1000);
  }
});

/* ── Keyboard shortcuts ── */
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, [contenteditable], select")) return;
  switch (e.key) {
    case " ": case "k":
      e.preventDefault(); togglePlay(); break;
    case "f":
      e.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
      break;
    case "i":
      e.preventDefault();
      toggleDrawer();
      break;
    case "Escape":
      if (drawerOpen) { e.preventDefault(); toggleDrawer(); }
      break;
    case "m":
      userMuted = !userMuted;
      applyVolume();
      break;
    case "ArrowLeft":
      e.preventDefault();
      player.currentTime = Math.max(0, player.currentTime - 5);
      if (dualTrack) audioPlayer.currentTime = player.currentTime;
      showControls();
      break;
    case "ArrowRight":
      e.preventDefault();
      player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
      if (dualTrack) audioPlayer.currentTime = player.currentTime;
      showControls();
      break;
    case "ArrowUp":
      e.preventDefault();
      userVolume = Math.min(1, userVolume + 0.1);
      userMuted = false;
      volumeSlider.value = userVolume;
      applyVolume();
      showControls();
      break;
    case "ArrowDown":
      e.preventDefault();
      userVolume = Math.max(0, userVolume - 0.1);
      volumeSlider.value = userVolume;
      applyVolume();
      showControls();
      break;
  }
});

/* ── Quality selector ── */
let allFormats = [];
let currentQuality = "";
let activeStreamUrl = streamUrl;

function qualityLabel(fmt) {
  const h = fmt.height || 0;
  let label = h ? h + "p" : (fmt.resolution || fmt.format_id);
  const hasVid = fmt.has_video;
  const hasAud = fmt.has_audio;
  let tag = "";
  if (hasVid && hasAud) tag = "A+V";
  else if (hasVid) tag = "V";
  else if (hasAud) tag = "A";
  return label + " \u00b7 " + tag + " \u00b7 " + (fmt.ext || "mp4");
}

function switchSource(videoUrl, useDualTrack) {
  const wasPlaying = !player.paused;
  const curTime = player.currentTime;

  player.src = videoUrl;
  player.muted = useDualTrack;

  if (useDualTrack) {
    dualTrack = true;
    audioPlayer.src = bestAudioUrl;
    audioPlayer.currentTime = curTime;
    audioPlayer.volume = userVolume;
    audioPlayer.muted = userMuted;
    if (wasPlaying) audioPlayer.play().catch(() => {});
  } else {
    dualTrack = false;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.src = "";
    player.muted = userMuted;
    player.volume = userVolume;
  }

  if (wasPlaying) {
    player.currentTime = curTime;
    player.play().catch(() => {});
  }
  updateVolumeIcon();
}

async function loadFormats() {
  if (!videoId) return;
  try {
    const info = await apiFetch("/api/info?url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + videoId));
    const fmts = (info.video_formats || []).filter((f) => f.has_video);
    if (!fmts.length) return;
    fmts.sort((a, b) => (b.height || 0) - (a.height || 0));
    allFormats = fmts;
    qualitySelect.innerHTML = '<option value="">Auto</option>';
    fmts.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.format_id;
      opt.textContent = qualityLabel(f);
      qualitySelect.appendChild(opt);
    });
  } catch (e) {
    console.warn("Failed to load formats:", e);
  }
}

qualitySelect.addEventListener("change", () => {
  const fid = qualitySelect.value;

  if (!fid) {
    /* Auto: revert to original stream (usually combined A+V) */
    switchSource(activeStreamUrl, false);
    return;
  }

  const fmt = allFormats.find((f) => f.format_id === fid);
  if (!fmt || !fmt.url) return;

  const fmtHasAudio = fmt.has_audio && fmt.acodec && fmt.acodec !== "none";
  const needsDualTrack = !fmtHasAudio && bestAudioUrl;
  const proxiedUrl = apiUrl("/api/stream?url=" + encodeURIComponent(fmt.url));

  switchSource(proxiedUrl, needsDualTrack);
  currentQuality = fid;
});

loadFormats();
applyVolume();

/* ── Settings theming ── */
(async function applyTheme() {
  try {
    const settings = await apiFetch("/api/settings");
    const theme = settings.theme || settings.colorScheme || {};
    const root = document.documentElement;
    if (theme.bg) root.style.setProperty("--bg", theme.bg);
    if (theme.text) root.style.setProperty("--text", theme.text);
    if (theme.accent) root.style.setProperty("--accent", theme.accent);
    if (theme.card) root.style.setProperty("--card", theme.card);
    if (theme.border) root.style.setProperty("--border", theme.border);
    if (theme.subtext) root.style.setProperty("--subtext", theme.subtext);
  } catch (e) {}
})();
