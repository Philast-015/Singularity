import { useState, useEffect, useRef, useCallback } from "react";
import {
  API_BASE,
  fetchData,
  saveData,
  formatTime,
  formatViews,
  extractTags,
} from "../api";

export default function VideoPlayer({
  videoInfo,
  videoFormats,
  bestAudioUrl,
  currentVideoId,
  onClose,
  addToWatchHistory,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const controlsRef = useRef(null);
  const progressRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [miniplayer, setMiniplayer] = useState(false);

  useEffect(() => {
    if (videoInfo && videoRef.current) {
      const v = videoRef.current;
      const a = audioRef.current;
      v.src = `${API_BASE}/api/stream?url=${encodeURIComponent(videoInfo.videoUrl)}`;
      if (videoInfo.audioUrl) {
        a.src = `${API_BASE}/api/stream?url=${encodeURIComponent(videoInfo.audioUrl)}`;
      }
      v.muted = true;
      a.muted = false;
      setQuality("");
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setBuffered(0);
      setControlsVisible(true);
      setMuted(false);
      setVolume(1);
      setMiniplayer(false);
      document.body.classList.remove("miniplayer");
      loadLikeSaveState();
    }
  }, [videoInfo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => {
      setPlaying(true);
      showControls();
      audioRef.current?.play().catch(() => {});
    };
    const onPause = () => {
      audioRef.current?.pause();
      setPlaying(false);
      setControlsVisible(true);
      clearTimeout(controlsTimeoutRef.current);
    };
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      syncAudio();
    };
    const onLoadedMeta = () => setDuration(v.duration);
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };
    const onEnded = () => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPlaying(false);
      setControlsVisible(true);
    };
    const onWaiting = () => {
      if (!audioRef.current?.paused) audioRef.current?.pause();
    };
    const onPlaying = () => {
      const a = audioRef.current;
      if (a?.paused && v.currentTime > 0) {
        a.currentTime = v.currentTime;
        a.play().catch(() => {});
      }
    };
    const onSeeking = () => {
      if (audioRef.current) audioRef.current.currentTime = v.currentTime;
    };
    const onError = () => {
      audioRef.current?.pause();
      setPlaying(false);
      setControlsVisible(true);
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoadedMeta);
    v.addEventListener("progress", onProgress);
    v.addEventListener("ended", onEnded);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("error", onError);
    };
  }, [videoInfo]);

  useEffect(() => {
    if (miniplayer) document.body.classList.add("miniplayer");
    else document.body.classList.remove("miniplayer");
  }, [miniplayer]);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (v) {
        v.pause();
        v.src = "";
      }
      if (a) {
        a.pause();
        a.src = "";
      }
    };
  }, []);

  async function loadLikeSaveState() {
    if (!currentVideoId) return;
    const likes = (await fetchData("likes")) || [];
    setIsLiked(likes.some((v) => v.id === currentVideoId));
    const bookmarks = (await fetchData("bookmarks")) || [];
    setIsSaved(bookmarks.some((v) => v.id === currentVideoId));
  }

  function syncAudio() {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a || !playing) return;
    const diff = Math.abs(v.currentTime - a.currentTime);
    if (diff > 0.3) a.currentTime = v.currentTime;
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  function getControlsDelay() {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue("--controls-timeout")
      .trim();
    const n = parseInt(val, 10);
    return isNaN(n) ? 2000 : n;
  }

  function showControls() {
    setControlsVisible(true);
    clearTimeout(controlsTimeoutRef.current);
    if (!videoRef.current?.paused) {
      controlsTimeoutRef.current = setTimeout(
        () => setControlsVisible(false),
        getControlsDelay(),
      );
    }
  }

  function seek(e) {
    const bar = progressRef.current;
    if (!bar || !videoRef.current?.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = pct * videoRef.current.duration;
    videoRef.current.currentTime = t;
    if (audioRef.current) audioRef.current.currentTime = t;
  }

  function applyQuality(formatId) {
    if (!videoFormats || videoFormats.length === 0) return;
    const fmt =
      videoFormats.find((f) => f.format_id === formatId) || videoFormats[0];
    if (!fmt) return;
    const v = videoRef.current;
    const a = audioRef.current;
    const wasPlaying = !v.paused;
    const curTime = v.currentTime;
    v.src = `${API_BASE}/api/stream?url=${encodeURIComponent(fmt.url)}`;
    if (bestAudioUrl) {
      a.src = `${API_BASE}/api/stream?url=${encodeURIComponent(bestAudioUrl)}`;
    }
    if (wasPlaying) {
      v.currentTime = curTime;
      a.currentTime = curTime;
      v.play().catch(() => {});
    }
  }

  async function toggleLike() {
    if (!currentVideoId || !videoInfo) return;
    let likes = (await fetchData("likes")) || [];
    const idx = likes.findIndex((v) => v.id === currentVideoId);
    const wasLiked = idx > -1;
    if (wasLiked) likes.splice(idx, 1);
    else {
      likes.unshift({
        id: currentVideoId,
        title: videoInfo.title,
        channel: videoInfo.channel,
        thumbnail: videoInfo.thumbnail,
      });
      extractTags(currentVideoId, true);
    }
    await saveData("likes", likes);
    setIsLiked(!wasLiked);
  }

  async function toggleBookmark() {
    if (!currentVideoId || !videoInfo) return;
    let bookmarks = (await fetchData("bookmarks")) || [];
    const idx = bookmarks.findIndex((v) => v.id === currentVideoId);
    const wasSaved = idx > -1;
    if (wasSaved) bookmarks.splice(idx, 1);
    else {
      bookmarks.unshift({
        id: currentVideoId,
        title: videoInfo.title,
        channel: videoInfo.channel,
        thumbnail: videoInfo.thumbnail,
      });
      extractTags(currentVideoId);
    }
    await saveData("bookmarks", bookmarks);
    setIsSaved(!wasSaved);
  }

  // keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      if (e.target.matches("input, textarea, [contenteditable]")) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.documentElement.requestFullscreen?.().catch(() => {});
          }
          break;
        case "i":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setMiniplayer((m) => !m);
          }
          break;
        case "Escape":
          if (!miniplayer) onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 10,
            );
            if (audioRef.current)
              audioRef.current.currentTime = videoRef.current.currentTime;
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration,
              videoRef.current.currentTime + 10,
            );
            if (audioRef.current)
              audioRef.current.currentTime = videoRef.current.currentTime;
          }
          break;
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [miniplayer]);

  const pct = duration ? (currentTime / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div id="playerView">
      <div
        className="player-container"
        onMouseMove={showControls}
        onMouseEnter={() => {
          clearTimeout(controlsTimeoutRef.current);
          setControlsVisible(true);
        }}
        onMouseLeave={showControls}
      >
        <video id="videoPlayer" ref={videoRef} onClick={togglePlay}></video>
        <audio id="audioPlayer" ref={audioRef} preload="auto"></audio>
        <div
          id="playerControls"
          ref={controlsRef}
          className={`player-controls ${controlsVisible ? "visible" : ""}`}
        >
          <div className="controls-top">
            <span className="video-title" id="playerTitle">
              {videoInfo?.title || ""}
            </span>
          </div>
          <div className="controls-center">
            <button
              className="big-play-btn"
              id="bigPlayBtn"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            >
              <i
                className={`bi ${playing ? "bi-pause-fill" : "bi-play-fill"}`}
              ></i>
            </button>
          </div>
          <div className="controls-bottom">
            <div className="progress-bar" ref={progressRef} onClick={seek}>
              <div
                className="progress-buffer"
                style={{ width: `${bufPct}%` }}
              ></div>
              <div
                className="progress-played"
                style={{ width: `${pct}%` }}
              ></div>
              <div className="progress-thumb" style={{ left: `${pct}%` }}></div>
            </div>
            <div className="controls-row">
              <div className="controls-left">
                <button className="ctrl-btn" id="playBtn" onClick={togglePlay}>
                  <i
                    className={`bi ${playing ? "bi-pause-fill" : "bi-play-fill"}`}
                  ></i>
                </button>
                <span className="time-display">
                  <span id="currentTime">{formatTime(currentTime)}</span> /{" "}
                  <span id="duration">{formatTime(duration)}</span>
                </span>
              </div>
              <div className="controls-right">
                <button
                  className="ctrl-btn"
                  id="muteBtn"
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                    if (audioRef.current) audioRef.current.muted = v.muted;
                    setMuted(v.muted);
                  }}
                >
                  <i
                    className={`bi ${muted ? "bi-volume-mute-fill" : "bi-volume-up-fill"}`}
                  ></i>
                </button>
                <input
                  type="range"
                  id="volumeSlider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    const v = videoRef.current;
                    if (!v) return;
                    v.volume = val;
                    if (audioRef.current) audioRef.current.volume = val;
                    v.muted = false;
                    if (audioRef.current) audioRef.current.muted = false;
                    setMuted(false);
                  }}
                />
                <select
                  id="qualitySelect"
                  value={quality}
                  onChange={(e) => {
                    setQuality(e.target.value);
                    applyQuality(e.target.value);
                  }}
                >
                  {(videoFormats || []).map((f) => (
                    <option key={f.format_id} value={f.format_id}>
                      {f.resolution || f.format_id} ({f.ext})
                    </option>
                  ))}
                </select>
                <button
                  className="ctrl-btn"
                  id="miniplayerBtn"
                  title="Miniplayer (i)"
                  onClick={() => setMiniplayer((m) => !m)}
                >
                  <i className="bi bi-pip"></i>
                </button>
                <button
                  className="ctrl-btn"
                  id="fullscreenBtn"
                  title="Fullscreen (f)"
                  onClick={() => {
                    if (!document.fullscreenElement)
                      document.documentElement
                        .requestFullscreen?.()
                        .catch(() => {});
                    else document.exitFullscreen?.().catch(() => {});
                  }}
                >
                  <i className="bi bi-fullscreen"></i>
                </button>
                <button
                  className="ctrl-btn"
                  id="closePlayerBtn"
                  title="Close"
                  onClick={onClose}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="meta">
        <h4 id="metaTitle">{videoInfo?.title || ""}</h4>
        <h6 id="metaChannel">
          {videoInfo?.channel || ""}
          {videoInfo?.views ? ` · ${formatViews(videoInfo.views)} views` : ""}
        </h6>
        <div className="player-actions">
          <button
            className={`action-btn ${isLiked ? "active" : ""}`}
            id="likeBtn"
            onClick={toggleLike}
          >
            <i className={`bi ${isLiked ? "bi-heart-fill" : "bi-heart"}`}></i>{" "}
            <span>Like</span>
          </button>
          <button
            className={`action-btn ${isSaved ? "active" : ""}`}
            id="bookmarkBtn"
            onClick={toggleBookmark}
          >
            <i
              className={`bi ${isSaved ? "bi-bookmark-fill" : "bi-bookmark"}`}
            ></i>{" "}
            <span>Save</span>
          </button>
          <button
            className="action-btn"
            id="openYtBtn"
            onClick={() =>
              window.open(
                `https://youtube.com/watch?v=${currentVideoId}`,
                "_blank",
              )
            }
          >
            <i className="bi bi-box-arrow-up-right"></i> <span>YouTube</span>
          </button>
        </div>
        <p id="metaDescription">{videoInfo?.description || ""}</p>
      </div>
    </div>
  );
}
