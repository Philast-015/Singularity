const data = document.getElementById("data");
const streamUrl = data?.dataset.streamUrl;
const title = data?.dataset.title || "Video";
const channel = data?.dataset.channel || "";

document.title = `Playing: ${title}`;
document.getElementById("title").textContent = title;
document.getElementById("channel").textContent = channel;

const player = document.getElementById("player");
const playBtn = document.getElementById("play-btn");
const seek = document.getElementById("seek");
const currentTime = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const fsBtn = document.getElementById("fullscreen-btn");

if (streamUrl) player.src = streamUrl;

function fmt(t) {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function togglePlay() {
  if (player.paused) {
    player.play();
    playBtn.textContent = "\u23F8";
  } else {
    player.pause();
    playBtn.textContent = "\u25B6";
  }
}

playBtn.addEventListener("click", togglePlay);

player.addEventListener("play", () => (playBtn.textContent = "\u23F8"));
player.addEventListener("pause", () => (playBtn.textContent = "\u25B6"));

player.addEventListener("timeupdate", () => {
  if (player.duration) {
    seek.value = (player.currentTime / player.duration) * 100;
    currentTime.textContent = fmt(player.currentTime);
  }
});

player.addEventListener("loadedmetadata", () => {
  durationEl.textContent = fmt(player.duration);
});

seek.addEventListener("input", () => {
  if (player.duration) {
    player.currentTime = (seek.value / 100) * player.duration;
  }
});

fsBtn.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "k") {
    e.preventDefault();
    togglePlay();
  }
  if (e.key === "f") {
    fsBtn.click();
  }
  if (e.key === "ArrowLeft") {
    player.currentTime = Math.max(0, player.currentTime - 5);
  }
  if (e.key === "ArrowRight") {
    player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
  }
});
