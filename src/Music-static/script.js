const data = document.getElementById("data");
const videoId = data?.dataset.videoId || "";
const initialTitle = data?.dataset.title || "Music";
const initialChannel = data?.dataset.channel || "";
const initialThumbnail = data?.dataset.thumbnail || "";
const apiBase = data?.dataset.apiBase || "http://127.0.0.1:5000";

let queue = [];
let queueIndex = -1;
let repeatOne = false;

const art = document.getElementById("art");
const titleEl = document.getElementById("title");
const channelEl = document.getElementById("channel");
const player = document.getElementById("player");
const playBtn = document.getElementById("play-btn");
const seek = document.getElementById("seek");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const muteBtn = document.getElementById("mute-btn");
const repeatBtn = document.getElementById("repeat-btn");
const list = document.getElementById("suggestions-list");

titleEl.textContent = initialTitle;
channelEl.textContent = initialChannel;
if (initialThumbnail) art.src = initialThumbnail;
document.title = `Playing: ${initialTitle}`;

function apiUrl(path) {
  return `${apiBase}${path}`;
}

async function fetchInfo(vidId) {
  const url = `https://www.youtube.com/watch?v=${vidId}`;
  const r = await fetch(apiUrl(`/api/info?url=${encodeURIComponent(url)}`));
  return r.json();
}

async function fetchRadio(query) {
  const r = await fetch(apiUrl(`/api/radio?q=${encodeURIComponent(query)}`));
  const d = await r.json();
  return d.results || [];
}

function fmt(t) {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function togglePlay() {
  if (player.paused) player.play();
  else player.pause();
}

function updatePlayBtn() {
  playBtn.innerHTML = player.paused
    ? '<i class="bi bi-play-fill"></i>'
    : '<i class="bi bi-pause-fill"></i>';
  if (art) art.classList.toggle("spinning", !player.paused);
}

function updateRepeatBtn() {
  repeatBtn.classList.toggle("active", repeatOne);
}

async function loadTrack(vidId) {
  try {
    const info = await fetchInfo(vidId);
    const audioFmts = info.audio_formats || [];
    if (!audioFmts.length) return;
    const streamUrl = audioFmts[0].url;
    if (!streamUrl) return;

    titleEl.textContent = info.title || initialTitle;
    channelEl.textContent = info.channel || initialChannel;
    const thumb = info.thumbnail || initialThumbnail;
    if (thumb) art.src = thumb;
    document.title = `Playing: ${info.title || initialTitle}`;

    player.src = apiUrl(`/api/stream?url=${encodeURIComponent(streamUrl)}`);
    player.play().catch(() => {});
  } catch (e) {
    console.error("loadTrack failed:", e);
  }
}

function highlightCurrentInQueue() {
  const items = list.querySelectorAll("li");
  items.forEach((li, i) => li.classList.toggle("active", i === queueIndex));
}

function playQueueItem(index) {
  if (index < 0 || index >= queue.length) return;
  queueIndex = index;
  const item = queue[index];
  loadTrack(item.id);
  highlightCurrentInQueue();
}

// --- Events ---

playBtn.addEventListener("click", togglePlay);
art.addEventListener("click", togglePlay);
player.addEventListener("play", updatePlayBtn);
player.addEventListener("pause", updatePlayBtn);

player.addEventListener("timeupdate", () => {
  if (player.duration) {
    seek.value = (player.currentTime / player.duration) * 100;
    currentTimeEl.textContent = fmt(player.currentTime);
  }
});

player.addEventListener("loadedmetadata", () => {
  durationEl.textContent = fmt(player.duration);
});

player.addEventListener("ended", () => {
  if (repeatOne) {
    player.currentTime = 0;
    player.play();
  } else if (queueIndex === -1 && queue.length > 0) {
    playQueueItem(0);
  } else {
    const next = queueIndex + 1;
    if (next < queue.length) playQueueItem(next);
  }
});

seek.addEventListener("input", () => {
  if (player.duration) {
    player.currentTime = (seek.value / 100) * player.duration;
  }
});

muteBtn.addEventListener("click", () => {
  player.muted = !player.muted;
  muteBtn.innerHTML = player.muted
    ? '<i class="bi bi-volume-mute-fill"></i>'
    : '<i class="bi bi-volume-up-fill"></i>';
});

repeatBtn.addEventListener("click", () => {
  repeatOne = !repeatOne;
  updateRepeatBtn();
});

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, [contenteditable]")) return;
  if (e.key === " " || e.key === "k") {
    e.preventDefault();
    togglePlay();
  }
  if (e.key === "m") muteBtn.click();
  if (e.key === "r") {
    repeatOne = !repeatOne;
    updateRepeatBtn();
  }
  if (e.key === "ArrowLeft") {
    player.currentTime = Math.max(0, player.currentTime - 5);
  }
  if (e.key === "ArrowRight") {
    player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
  }
});

// --- Queue rendering ---

function renderQueue() {
  list.innerHTML = "";
  queue.forEach((s, i) => {
    const li = document.createElement("li");
    if (i === queueIndex) li.classList.add("active");
    li.innerHTML = `
      <img src="${s.thumbnail || ""}" alt="" loading="lazy" onerror="this.style.display='none'">
      <div class="s-info">
        <div class="s-title">${s.title || "Untitled"}</div>
        <div class="s-channel">${s.channel || ""}</div>
      </div>
      <div class="s-dur">${s.duration || ""}</div>
    `;
    li.addEventListener("click", () => playQueueItem(i));
    list.appendChild(li);
  });
}

// --- Init ---

(async function init() {
  if (!videoId) return;
  loadTrack(videoId);
  try {
    const results = await fetchRadio(initialTitle);
    queue = results.filter((s) => s.id !== videoId);
    renderQueue();
  } catch (e) {
    console.error("Failed to fetch suggestions:", e);
  }
})();

(async function fetchSettings() {
  try {
    const r = await fetch(apiUrl("/api/settings"));
    const settings = await r.json();
    const theme = settings.theme || settings.colorScheme || {};
    const root = document.documentElement;
    if (theme.bg) root.style.setProperty("--bg", theme.bg);
    if (theme.text) root.style.setProperty("--text", theme.text);
    if (theme.accent) root.style.setProperty("--accent", theme.accent);
    if (theme.card) root.style.setProperty("--card", theme.card);
    if (theme.border) root.style.setProperty("--border", theme.border);
    if (theme.subtext) root.style.setProperty("--subtext", theme.subtext);
    if (theme.muted) root.style.setProperty("--muted", theme.muted);
  } catch (e) {}
})();
