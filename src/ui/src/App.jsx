import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import {
  searchYouTube,
  getVideoInfo,
  fetchData,
  saveData,
  fetchSettings,
  saveSettingsToServer,
  fetchRecommend,
  fetchRadio,
} from "./api";
import Sidebar from "./components/Sidebar";
import SearchHistory from "./components/SearchHistory";
import VideoPlayer from "./components/VideoPlayer";
import logo from "./logo.png";
import MusicPlayer from "./components/MusicPlayer";
import AlbumDetail from "./components/AlbumDetail";
import AlbumModals from "./components/AlbumModals";
import SettingsPanel from "./components/SettingsPanel";
import VideoCard from "./components/VideoCard";
import LibraryPage from "./components/LibraryPage";
import LikedPage from "./components/LikedPage";
import SavedPage from "./components/SavedPage";
import PlaylistPage from "./components/PlaylistPage";

const RADIUS_MAP = { none: "0", small: "4px", medium: "10px", full: "999px" };
const ACCENT_MAP = {
  red: { base: "#ff0033", hover: "#cc0029" },
  blue: { base: "#0066ff", hover: "#0052cc" },
  green: { base: "#00aa44", hover: "#008836" },
  purple: { base: "#8833ff", hover: "#6b29cc" },
  orange: { base: "#ff6600", hover: "#cc5200" },
  yellow: { base: "#d1a100", hover: "#CF9F00" },
  neon: { base: "#7dd100", hover: "#72BF00" },
};
const GRID_MIN = { auto: "280px", 2: "500px", 3: "320px", 4: "240px" };
const BACKGROUND_MAP = {
  obsidian: "#0a0a0f",
  dark: "#0f0f0f",
  slate: "#111318",
  charcoal: "#141414",
  midnight: "#0d1117",
  light: "#f5f5f5",
  white: "#ffffff",
  warm: "#faf6f0",
};
const GLASS_LEVELS = {
  subtle: { blur: "6px", alpha: "0.12", alpha2: "0.18" },
  medium: { blur: "12px", alpha: "0.07", alpha2: "0.13" },
  strong: { blur: "24px", alpha: "0.04", alpha2: "0.09" },
};
const GLASS_COLOR_MAP = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  green: { r: 39, g: 171, b: 46 },
  blue: { r: 0, g: 102, b: 255 },
  red: { r: 255, g: 0, b: 51 },
  purple: { r: 136, g: 51, b: 255 },
  orange: { r: 255, g: 102, b: 0 },
  yellow: { r: 209, g: 161, b: 0 },
};

function setCookie(name, value, hours) {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (const c of cookies) {
    const [key, ...rest] = c.split("=");
    if (decodeURIComponent(key) === name)
      return decodeURIComponent(rest.join("="));
  }
  return null;
}

function loadSettings() {
  const raw = getCookie("settings");
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return {};
}

export default function App() {
  const navigate = useNavigate();
  const [musicMode, setMusicModeState] = useState(
    () => localStorage.getItem("musicMode") === "true",
  );
  const [results, setResults] = useState([]);
  const [isRecommend, setIsRecommend] = useState(true);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [playerVisible, setPlayerVisible] = useState(false);
  const [vPlayerInfo, setVPlayerInfo] = useState(null);
  const [videoFormats, setVideoFormats] = useState([]);
  const [vBestAudioUrl, setVBestAudioUrl] = useState("");
  const [vCurrentVideoId, setVCurrentVideoId] = useState(null);

  const [musicVisible, setMusicVisible] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [musicQueue, setMusicQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  const [albums, setAlbums] = useState([]);
  const [currentAlbumId, setCurrentAlbumId] = useState(null);
  const [albumDetailVisible, setAlbumDetailVisible] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [addToAlbumVisible, setAddToAlbumVisible] = useState(false);

  const [settingsVersion, setSettingsVersion] = useState(0);

  const searchInputRef = useRef(null);
  const musicAudioRef = useRef(new Audio());
  const musicAudio = musicAudioRef.current;

  useEffect(() => {
    function handler() {
      setCreateModalVisible(true);
    }
    document.addEventListener("open-create-album", handler);
    return () => document.removeEventListener("open-create-album", handler);
  }, []);

  function toggleMusicMode(checked) {
    setMusicModeState(checked);
    localStorage.setItem("musicMode", checked);
    if (checked) {
      setPlayerVisible(false);
    }
  }

  useEffect(() => {
    fetchRecommend().then((videos) => {
      if (videos.length > 0) {
        setResults(videos);
        setIsRecommend(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!musicMode) return;
    fetchRadio("today's top hits 2025").then((videos) => {
      if (videos.length > 0) {
        setResults((prev) => {
          if (prev.length > 0 && !document.querySelector("#searchInput")?.value)
            return prev;
          setIsRecommend(true);
          return videos;
        });
      }
    });
  }, [musicMode]);

  useEffect(() => {
    const s = loadSettings();
    applySettingsCSS(s);
    fetchSettings()
      .then((s) => {
        if (Object.keys(s).length > 0 && !getCookie("settings")) {
          setCookie("settings", JSON.stringify(s), 24 * 30);
          setSettingsVersion((v) => v + 1);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    applySettingsCSS(loadSettings());
  }, [settingsVersion]);

  function applySettingsCSS(s) {
    const theme = s.theme || "dark";
    const sRad = s.searchRadius || "medium";
    const cRad = s.cardRadius || "small";
    const accent = s.accent || "red";
    const grid = s.gridCols || "auto";
    const anim = s.animations || "on";
    const sWidth = s.sidebarWidth || "52px";
    const sIconSize = s.sidebarIconSize || "medium";
    const sPosition = s.sidebarPosition || "center";
    const sRadius = s.sidebarRadius || "small";
    const searchWidth = s.searchWidth || "medium";
    const maxWidth = s.contentMaxWidth || "none";
    const pWidth = s.playerWidth || "normal";
    const miniSize = s.miniplayerSize || "medium";
    const progHeight = s.progressHeight || "medium";
    const artSize = s.albumArtSize || "medium";
    const dockH = s.dockHeight || "64px";
    const plCardSize = s.playlistCardSize || "medium";
    const albumCardSize = s.albumCardSize || "medium";
    document.body.classList.toggle("light", theme === "light");
    document.documentElement.style.setProperty(
      "--search-radius",
      RADIUS_MAP[sRad] || "10px",
    );
    document.documentElement.style.setProperty(
      "--card-radius",
      RADIUS_MAP[cRad] || "12px",
    );
    const ac = ACCENT_MAP[accent] || ACCENT_MAP.red;
    document.documentElement.style.setProperty("--accent", ac.base);
    document.documentElement.style.setProperty("--accent-hover", ac.hover);
    document.documentElement.style.setProperty(
      "--grid-min",
      GRID_MIN[grid] || "280px",
    );
    document.body.classList.toggle("anim-off", anim !== "on");

    const viewMode = s.viewMode || "grid";
    document.body.classList.toggle("view-grid", viewMode === "grid");
    document.body.classList.toggle("view-list", viewMode === "list");
    document.body.classList.toggle("view-full", viewMode === "full");

    document.documentElement.style.setProperty("--sidebar-width", sWidth);
    const iconFontSizes = { small: "1rem", medium: "1.25rem", large: "1.5rem" };
    document.documentElement.style.setProperty(
      "--sidebar-icon-size",
      iconFontSizes[sIconSize] || "1.25rem",
    );
    document.body.classList.toggle("sidebar-top", sPosition === "top");
    document.body.classList.toggle("sidebar-center", sPosition === "center");
    const radiusVals = {
      none: "0",
      small: "6px",
      medium: "10px",
      full: "999px",
    };
    document.documentElement.style.setProperty(
      "--sidebar-radius",
      radiusVals[sRadius] || "10px",
    );
    const searchWidths = { compact: "320px", medium: "500px", full: "100%" };
    document.documentElement.style.setProperty(
      "--search-width",
      searchWidths[searchWidth] || "500px",
    );
    document.documentElement.style.setProperty(
      "--content-max-width",
      maxWidth === "none" ? "none" : maxWidth,
    );
    const playerWidths = { normal: "1000px", wide: "1200px", full: "100%" };
    const miniWidths = { small: "280px", medium: "360px", large: "480px" };
    const miniHeights = { small: "158px", medium: "203px", large: "270px" };
    document.documentElement.style.setProperty(
      "--player-max-width",
      playerWidths[pWidth] || "1000px",
    );
    document.documentElement.style.setProperty(
      "--mini-width",
      miniWidths[miniSize] || "360px",
    );
    document.documentElement.style.setProperty(
      "--mini-height",
      miniHeights[miniSize] || "203px",
    );
    const progHeights = { thin: "3px", medium: "4px", thick: "6px" };
    document.documentElement.style.setProperty(
      "--progress-height",
      progHeights[progHeight] || "4px",
    );
    const artSizes = { small: "36px", medium: "46px", large: "56px" };
    document.documentElement.style.setProperty(
      "--album-art-size",
      artSizes[artSize] || "46px",
    );
    document.documentElement.style.setProperty("--dock-height", dockH);
    const plCardSizes = { small: "130px", medium: "160px", large: "200px" };
    document.documentElement.style.setProperty(
      "--pl-card-min",
      plCardSizes[plCardSize] || "160px",
    );
    const albumCardSizes = { small: "100px", medium: "130px", large: "160px" };
    document.documentElement.style.setProperty(
      "--album-card-min",
      albumCardSizes[albumCardSize] || "130px",
    );

    const cTimeout = s.controlsTimeout || "2s";
    const timeoutMap = {
      "1s": "1000",
      "2s": "2000",
      "3s": "3000",
      "5s": "5000",
      never: "999999",
    };
    document.documentElement.style.setProperty(
      "--controls-timeout",
      timeoutMap[cTimeout] || "2000",
    );

    const glassEffect = s.glassEffect || "off";

    // Body background (Appearance > Background)
    const bgColor = s.bgColor;
    if (bgColor && BACKGROUND_MAP[bgColor]) {
      document.documentElement.style.setProperty(
        "--bg",
        BACKGROUND_MAP[bgColor],
      );
    } else {
      document.documentElement.style.removeProperty("--bg");
    }

    // Glass effect (Transparency)
    if (glassEffect !== "off") {
      const glassColor = s.glassColor || "white";
      const isLight = s.theme === "light";
      const g = GLASS_LEVELS[glassEffect];
      const gc = GLASS_COLOR_MAP[glassColor] || GLASS_COLOR_MAP.white;
      document.documentElement.style.setProperty("--glass-blur", g.blur);
      document.documentElement.style.setProperty(
        "--surface",
        `rgba(${gc.r},${gc.g},${gc.b},${isLight ? "0.5" : g.alpha})`,
      );
      document.documentElement.style.setProperty(
        "--surface2",
        `rgba(${gc.r},${gc.g},${gc.b},${isLight ? "0.6" : g.alpha2})`,
      );
      const bgHex =
        (s.bgColor && BACKGROUND_MAP[s.bgColor]) ||
        (isLight ? BACKGROUND_MAP.light : BACKGROUND_MAP.dark);
      const br = parseInt(bgHex.slice(1, 3), 16);
      const bg = parseInt(bgHex.slice(3, 5), 16);
      const bb = parseInt(bgHex.slice(5, 7), 16);
      const bgAlpha = isLight ? "0.7" : "0.5";
      document.documentElement.style.setProperty(
        "--bg-glass",
        `rgba(${br},${bg},${bb},${bgAlpha})`,
      );
      document.body.classList.add("has-glass");
    } else {
      document.body.classList.remove("has-glass");
      document.documentElement.style.removeProperty("--glass-blur");
      document.documentElement.style.removeProperty("--surface");
      document.documentElement.style.removeProperty("--surface2");
      document.documentElement.style.removeProperty("--bg-glass");
    }
  }

  function updateSetting(key, value) {
    const s = loadSettings();
    s[key] = value;
    saveSettingsToServer(s);
    setCookie("settings", JSON.stringify(s), 24 * 30);
    setSettingsVersion((v) => v + 1);
  }

  const doSearch = useCallback(async (query) => {
    setShowHistory(false);
    setIsRecommend(false);
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await searchYouTube(query);
      setResults(data.results || []);
      const s = loadSettings();
      if (s.searchHistoryEnabled !== "off") {
        const history = (await fetchData("history")) || [];
        const idx = history.indexOf(query);
        if (idx > -1) history.splice(idx, 1);
        history.unshift(query);
        const maxLen = parseInt(s.historyCount, 10) || 15;
        if (history.length > maxLen) history.pop();
        await saveData("history", history);
        setSearchHistory(history);
      }
    } catch (e) {
      setSearchError(e.message);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  async function loadSearchHistory() {
    setSearchHistory(await fetchData("history"));
  }

  async function addToWatchHistory(id, title, channel, thumbnail) {
    const s = loadSettings();
    if (s.watchHistoryEnabled === "off") return;
    const wh = (await fetchData("watch-history")) || [];
    const idx = wh.findIndex((v) => v.id === id);
    if (idx > -1) wh.splice(idx, 1);
    wh.unshift({ id, title, channel, thumbnail });
    await saveData("watch-history", wh);
  }

  const openVideo = useCallback(async (v) => {
    const url = v.url || `https://www.youtube.com/watch?v=${v.id}`;
    const videoId = v.id;
    setPlayerVisible(true);
    document.body.classList.remove("miniplayer");
    try {
      const data = await getVideoInfo(url);
      const vFormats = data.video_formats || [];
      const bAudioUrl = data.best_audio_url;
      const firstVideoUrl = vFormats.length > 0 ? vFormats[0].url : "";
      if (!firstVideoUrl) throw new Error("No playable video formats found");
      const thumb =
        data.thumbnail ||
        (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : "");
      setVPlayerInfo({
        title: data.title || "Unknown",
        channel: data.channel || "Unknown",
        views: data.views,
        description: data.description,
        thumbnail: thumb,
        id: videoId,
        videoUrl: firstVideoUrl,
        audioUrl: bAudioUrl,
        formats: vFormats,
        bestAudioUrl: bAudioUrl,
      });
      setVideoFormats(vFormats);
      setVBestAudioUrl(bAudioUrl);
      setVCurrentVideoId(videoId);
      addToWatchHistory(
        videoId,
        data.title || "Unknown",
        data.channel || "Unknown",
        thumb,
      );
    } catch (e) {
      console.error(e);
      setPlayerVisible(false);
    }
  }, []);

  const openMusicTrack = useCallback(async (v) => {
    const url = v.url || `https://www.youtube.com/watch?v=${v.id}`;
    const videoId = v.id;
    try {
      const data = await getVideoInfo(url);
      const audioUrl = data.best_audio_url;
      const vFormats = data.video_formats || [];
      const firstVideoUrl = vFormats.length > 0 ? vFormats[0].url : "";
      if (!audioUrl && !firstVideoUrl) return;
      const track = {
        id: videoId,
        title: data.title || v.title,
        channel: data.channel || v.channel,
        thumbnail: data.thumbnail || v.thumbnail,
        audio_url: audioUrl,
        duration: data.duration || v.duration,
      };
      playMusicQueue([track], 0);
      addToWatchHistory(
        videoId,
        data.title || "Unknown",
        data.channel || "Unknown",
        track.thumbnail,
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  function playMusicQueue(tracks, startIdx) {
    setMusicQueue(tracks);
    setQueueIndex(startIdx);
    if (tracks.length > 0) {
      setCurrentTrack(tracks[startIdx]);
      setMusicVisible(true);
      document.body.classList.add("has-dock");
    }
  }

  const loadAlbums = useCallback(async () => {
    const res = await fetchData("albums");
    const arr = Array.isArray(res) ? res : [];
    setAlbums(arr);
    return arr;
  }, []);

  async function saveAlbums(newAlbums) {
    setAlbums(newAlbums);
    await saveData("albums", newAlbums);
  }

  function handleCardClick(v) {
    if (musicMode) openMusicTrack(v);
    else openVideo(v);
  }

  function goHome() {
    setPlayerVisible(false);
    setMusicVisible(false);
    setAlbumDetailVisible(false);
    navigate("/");
  }

  return (
    <>
      <Sidebar musicMode={musicMode} onToggleMusic={toggleMusicMode} />

      <Routes>
        <Route
          path="/"
          element={
            <div id="searchView">
              <header>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goHome();
                  }}
                >
                  <img src={logo} alt="" style={{width:'22px',height:'22px',borderRadius:'4px',objectFit:'cover'}} />
                  <span id="brandName">
                    {musicMode ? "Music" : "Singularity"}
                  </span>
                </a>
                <form
                  id="searchForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = searchInputRef.current?.value?.trim();
                    if (q) doSearch(q);
                  }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    id="searchInput"
                    placeholder="Search YouTube..."
                    autoComplete="off"
                    onFocus={() => {
                      loadSearchHistory();
                      setShowHistory(true);
                    }}
                    onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                    onInput={() => setShowHistory(false)}
                  />
                  <button type="submit">
                    <i className="bi bi-search-heart"></i>
                  </button>
                </form>
              </header>

              <SearchHistory
                visible={showHistory}
                history={searchHistory}
                onSelect={(q) => {
                  if (searchInputRef.current) searchInputRef.current.value = q;
                  doSearch(q);
                }}
              />

              <div id="results">
                {searchLoading && <div className="loading"></div>}
                {searchError && <div className="error">{searchError}</div>}
                {!searchLoading &&
                  !searchError &&
                  isRecommend &&
                  results.length > 0 && (
                    <div className="results-label">
                      <i className="bi bi-star-fill"></i> Recommended for you
                    </div>
                  )}
                {!searchLoading &&
                  !searchError &&
                  results.map((r) => (
                    <VideoCard
                      key={r.id}
                      video={r}
                      onClick={() => handleCardClick(r)}
                    />
                  ))}
              </div>
            </div>
          }
        />
        <Route
          path="/library"
          element={
            <LibraryPage
              musicMode={musicMode}
              onToggleMusic={toggleMusicMode}
              openVideo={openVideo}
              openMusicTrack={openMusicTrack}
              albums={albums}
              loadAlbums={loadAlbums}
              openAlbum={(id) => {
                setCurrentAlbumId(id);
                setAlbumDetailVisible(true);
              }}
            />
          }
        />
        <Route
          path="/library/liked"
          element={
            <LikedPage
              openVideo={openVideo}
              openMusicTrack={openMusicTrack}
              musicMode={musicMode}
            />
          }
        />
        <Route
          path="/library/saved"
          element={
            <SavedPage
              openVideo={openVideo}
              openMusicTrack={openMusicTrack}
              musicMode={musicMode}
            />
          }
        />
        <Route
          path="/library/playlist/:playlistId"
          element={
            <PlaylistPage
              openVideo={openVideo}
              openMusicTrack={openMusicTrack}
              musicMode={musicMode}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPanel
              getSettings={loadSettings}
              updateSetting={updateSetting}
            />
          }
        />
      </Routes>

      <AlbumDetail
        visible={albumDetailVisible}
        albumId={currentAlbumId}
        albums={albums}
        onClose={() => {
          setAlbumDetailVisible(false);
          loadAlbums();
        }}
        onSave={saveAlbums}
        playMusicQueue={playMusicQueue}
      />

      <AlbumModals
        createVisible={createModalVisible}
        setCreateVisible={setCreateModalVisible}
        addVisible={addToAlbumVisible}
        setAddVisible={setAddToAlbumVisible}
        albums={albums}
        onSave={saveAlbums}
        currentTrack={currentTrack}
        loadAlbums={loadAlbums}
      />

      {playerVisible && vPlayerInfo && (
        <VideoPlayer
          videoInfo={vPlayerInfo}
          videoFormats={videoFormats}
          bestAudioUrl={vBestAudioUrl}
          currentVideoId={vCurrentVideoId}
          onClose={() => {
            setPlayerVisible(false);
            document.body.classList.remove("miniplayer");
          }}
          addToWatchHistory={addToWatchHistory}
        />
      )}

      <MusicPlayer
        visible={musicVisible}
        currentTrack={currentTrack}
        musicAudio={musicAudio}
        musicQueue={musicQueue}
        queueIndex={queueIndex}
        setQueueIndex={setQueueIndex}
        setCurrentTrack={setCurrentTrack}
        setMusicQueue={setMusicQueue}
        onClose={() => {
          setMusicVisible(false);
          document.body.classList.remove("has-dock");
          musicAudio.pause();
          musicAudio.src = "";
          setMusicQueue([]);
          setQueueIndex(-1);
        }}
        onAddToAlbum={() => {
          loadAlbums();
          setAddToAlbumVisible(true);
        }}
      />
    </>
  );
}
