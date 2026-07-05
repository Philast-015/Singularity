import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTags, fetchTagExceptions, saveTagExceptions } from "../api";

const BACKGROUND_OPTIONS = [
  { value: "obsidian", label: "Obsidian", swatch: "#0a0a0f" },
  { value: "dark", label: "Dark", swatch: "#0f0f0f" },
  { value: "slate", label: "Slate", swatch: "#111318" },
  { value: "charcoal", label: "Charcoal", swatch: "#141414" },
  { value: "midnight", label: "Midnight", swatch: "#0d1117" },
  { value: "light", label: "Light", swatch: "#f5f5f5" },
  { value: "white", label: "White", swatch: "#ffffff" },
  { value: "warm", label: "Warm", swatch: "#faf6f0" },
];

const GLASS_COLOR_OPTIONS = [
  { value: "white", label: "White", swatch: "#ffffff" },
  { value: "black", label: "Black", swatch: "#000000" },
  { value: "green", label: "Green", swatch: "#27ab2e" },
  { value: "blue", label: "Blue", swatch: "#0066ff" },
  { value: "red", label: "Red", swatch: "#ff0033" },
  { value: "purple", label: "Purple", swatch: "#8833ff" },
  { value: "orange", label: "Orange", swatch: "#ff6600" },
  { value: "yellow", label: "Yellow", swatch: "#d1a100" },
];

const ACCENT_OPTIONS = [
  { value: "red", label: "Red", swatch: "#ff0033" },
  { value: "blue", label: "Blue", swatch: "#0066ff" },
  { value: "green", label: "Green", swatch: "#00aa44" },
  { value: "purple", label: "Purple", swatch: "#8833ff" },
  { value: "orange", label: "Orange", swatch: "#ff6600" },
  { value: "yellow", label: "Yellow", swatch: "#d1a100" },
  { value: "neon", label: "Neon", swatch: "#7dd100" },
];

const SECTIONS = [
  {
    id: "appearance",
    label: "Appearance",
    icon: "bi-palette",
    settings: [
      {
        key: "theme",
        label: "Theme",
        type: "choice",
        options: ["dark", "light"],
        icons: ["bi-moon", "bi-sun"],
      },
      {
        key: "accent",
        label: "Accent color",
        type: "swatch",
        options: ACCENT_OPTIONS,
      },
      {
        key: "bgColor",
        label: "Background",
        type: "swatch",
        options: BACKGROUND_OPTIONS,
      },
      {
        key: "animations",
        label: "Animations",
        type: "choice",
        options: ["on", "off"],
        icons: ["bi-play-circle", "bi-pause-circle"],
      },
    ],
  },
  {
    id: "transparency",
    label: "Transparency",
    icon: "bi-droplet",
    settings: [
      {
        key: "glassEffect",
        label: "Glass effect",
        type: "choice",
        options: ["off", "subtle", "medium", "strong"],
        icons: ["bi-x-circle", "bi-droplet-half", "bi-droplet", "bi-droplet-fill"],
      },
      {
        key: "glassColor",
        label: "Glass tint",
        type: "swatch",
        options: GLASS_COLOR_OPTIONS,
      },
    ],
  },
  {
    id: "sidebar",
    label: "Sidebar",
    icon: "bi-layout-sidebar",
    settings: [
      {
        key: "sidebarWidth",
        label: "Width",
        type: "choice",
        options: ["40px", "48px", "52px", "56px", "60px"],
      },
      {
        key: "sidebarIconSize",
        label: "Icon size",
        type: "choice",
        options: ["small", "medium", "large"],
      },
      {
        key: "sidebarPosition",
        label: "Position",
        type: "choice",
        options: ["center", "top"],
      },
      {
        key: "sidebarRadius",
        label: "Bar radius",
        type: "choice",
        options: ["none", "small", "medium", "full"],
      },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    icon: "bi-grid-3x3-gap",
    settings: [
      {
        key: "gridCols",
        label: "Search grid columns",
        type: "choice",
        options: ["auto", "2", "3", "4"],
      },
      {
        key: "cardRadius",
        label: "Card radius",
        type: "choice",
        options: ["none", "small", "medium", "full"],
      },
      {
        key: "searchRadius",
        label: "Search bar radius",
        type: "choice",
        options: ["none", "small", "medium", "full"],
      },
      {
        key: "searchWidth",
        label: "Search bar width",
        type: "choice",
        options: ["compact", "medium", "full"],
      },
      {
        key: "contentMaxWidth",
        label: "Content max width",
        type: "choice",
        options: ["none", "1000px", "1200px", "1400px", "1600px"],
      },
    ],
  },
  {
    id: "videoPlayer",
    label: "Video player",
    icon: "bi-camera-video",
    settings: [
      {
        key: "playerWidth",
        label: "Player width",
        type: "choice",
        options: ["normal", "wide", "full"],
      },
      {
        key: "defaultQuality",
        label: "Default quality",
        type: "choice",
        options: ["auto", "2160p", "1080p", "720p", "480p", "360p"],
      },
      {
        key: "miniplayerSize",
        label: "Miniplayer size",
        type: "choice",
        options: ["small", "medium", "large"],
      },
      {
        key: "progressHeight",
        label: "Progress bar",
        type: "choice",
        options: ["thin", "medium", "thick"],
      },
      {
        key: "controlsTimeout",
        label: "Controls hide delay",
        type: "choice",
        options: ["1s", "2s", "3s", "5s", "never"],
      },
      {
        key: "autoplay",
        label: "Autoplay",
        type: "choice",
        options: ["off", "on"],
      },
    ],
  },
  {
    id: "musicPlayer",
    label: "Music player",
    icon: "bi-music-note-beamed",
    settings: [
      {
        key: "albumArtSize",
        label: "Album art size",
        type: "choice",
        options: ["small", "medium", "large"],
      },
      {
        key: "dockHeight",
        label: "Dock height",
        type: "choice",
        options: ["52px", "64px", "76px", "88px"],
      },
    ],
  },
  {
    id: "library",
    label: "Library",
    icon: "bi-collection",
    settings: [
      {
        key: "showHistory",
        label: "Show history",
        type: "choice",
        options: ["on", "off"],
      },
      {
        key: "historyCount",
        label: "History items",
        type: "choice",
        options: ["5", "10", "15", "20", "30"],
      },
      {
        key: "playlistCardSize",
        label: "Playlist card size",
        type: "choice",
        options: ["small", "medium", "large"],
      },
      {
        key: "albumCardSize",
        label: "Album card size",
        type: "choice",
        options: ["small", "medium", "large"],
      },
    ],
  },
  {
    id: "search",
    label: "Search",
    icon: "bi-search",
    settings: [
      {
        key: "trendingMode",
        label: "Trending on startup",
        type: "choice",
        options: ["on", "off"],
      },
      {
        key: "searchHistoryEnabled",
        label: "Save search history",
        type: "choice",
        options: ["on", "off"],
      },
      {
        key: "showHistoryDropdown",
        label: "History dropdown",
        type: "choice",
        options: ["on", "off"],
      },
    ],
  },
  {
    id: "tags",
    label: "Tags",
    icon: "bi-tags",
    settings: [],
  },
  {
    id: "privacy",
    label: "Privacy & data",
    icon: "bi-shield-check",
    settings: [
      {
        key: "watchHistoryEnabled",
        label: "Save watch history",
        type: "choice",
        options: ["on", "off"],
      },
    ],
  },
];

export default function SettingsPanel({ getSettings, updateSetting }) {
  const navigate = useNavigate();
  const s = getSettings();
  const [tagList, setTagList] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [excList, setExcList] = useState([]);
  const [excInput, setExcInput] = useState("");
  useEffect(() => {
    fetchTags().then(setTagList).catch(() => {});
    fetchTagExceptions().then(setExcList).catch(() => {});
  }, []);
  async function addTag() {
    const t = tagInput.trim();
    if (!t || tagList.includes(t)) return;
    const updated = [...tagList, t];
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setTagList(updated);
    setTagInput("");
  }
  async function removeTag(tag) {
    const updated = tagList.filter((t) => t !== tag);
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setTagList(updated);
  }
  async function addException() {
    const t = excInput.trim().toLowerCase();
    if (!t || excList.includes(t)) return;
    const updated = [...excList, t];
    await saveTagExceptions(updated);
    setExcList(updated);
    setExcInput("");
  }
  async function removeException(exc) {
    const updated = excList.filter((e) => e !== exc);
    await saveTagExceptions(updated);
    setExcList(updated);
  }
  const [openSections, setOpenSections] = useState(() => {
    const opened = {};
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("settingsOpen") || "{}");
        SECTIONS.forEach((sec) => {
          opened[sec.id] = saved[sec.id] !== false;
        });
      } catch {
        SECTIONS.forEach((sec) => {
          opened[sec.id] = true;
        });
      }
    }
    return opened;
  });

  function toggleSection(id) {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("settingsOpen", JSON.stringify(next));
      return next;
    });
  }

  function getDefault(key) {
    const defaults = {
      theme: "dark",
      accent: "red",
      animations: "on",
      searchRadius: "medium",
      cardRadius: "small",
      gridCols: "auto",
      sidebarWidth: "52px",
      sidebarIconSize: "medium",
      sidebarPosition: "center",
      sidebarRadius: "small",
      searchWidth: "medium",
      contentMaxWidth: "none",
      playerWidth: "normal",
      defaultQuality: "auto",
      miniplayerSize: "medium",
      progressHeight: "medium",
      controlsTimeout: "2s",
      autoplay: "off",
      albumArtSize: "medium",
      dockHeight: "64px",
      showHistory: "on",
      historyCount: "15",
      playlistCardSize: "medium",
      albumCardSize: "medium",
      trendingMode: "on",
      searchHistoryEnabled: "on",
      showHistoryDropdown: "on",
      watchHistoryEnabled: "on",
      glassEffect: "off",
      glassColor: "white",
    };
    return defaults[key];
  }

  function isActive(setting, value) {
    if (setting === "accent") return (s.accent || "red") === value;
    return (s[setting] ?? getDefault(setting)) === value;
  }

  function handleClick(setting, value) {
    updateSetting(setting, value);
  }

  async function resetAll() {
    if (
      !confirm(
        "Reset all data? This will clear watch history, search history, bookmarks, likes, albums, tags, and settings.",
      )
    )
      return;
    await fetch("/api/reset", { method: "POST" }).catch(() => {});
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => {});
    document.cookie =
      "settings=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
  }

  return (
    <div id="settingsPage">
      <div className="lib-header">
        <button className="lib-back" onClick={() => navigate("/")}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1>Settings</h1>
      </div>
      <div className="lib-body">
        {SECTIONS.map((section) => (
          <div key={section.id} className="set-section">
            <button
              className={`set-section-header ${openSections[section.id] ? "open" : ""}`}
              onClick={() => toggleSection(section.id)}
            >
              <i className={`bi ${section.icon}`}></i>
              <span>{section.label}</span>
              <i
                className={`bi bi-chevron-down set-chevron ${openSections[section.id] ? "open" : ""}`}
              ></i>
            </button>
            {openSections[section.id] && (
              <div className="set-section-body">
                {section.settings.map((setting) => (
                  <div key={setting.key} className="set-row">
                    <div className="set-row-label">{setting.label}</div>
                    {setting.type === "swatch" ? (
                      <div className="set-swatches">
                        {setting.options.map((o) => (
                          <button
                            key={o.value}
                            className={`set-swatch ${isActive(setting.key, o.value) ? "active" : ""}`}
                            style={{ "--swatch": o.swatch }}
                            onClick={() => handleClick(setting.key, o.value)}
                            title={o.label}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="set-options">
                        {setting.options.map((opt, i) => (
                          <button
                            key={opt}
                            className={`set-opt ${isActive(setting.key, opt) ? "active" : ""}`}
                            onClick={() => handleClick(setting.key, opt)}
                          >
                            {setting.icons && (
                              <i className={`bi ${setting.icons[i]}`}></i>
                            )}
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {section.id === "tags" && (
                  <>
                    <div className="set-row">
                      <div className="set-row-label">All tags</div>
                    </div>
                    <div className="set-row" style={{ gap: "4px", flexWrap: "wrap" }}>
                      {tagList.length === 0 && <span style={{ opacity: 0.5, fontSize: "0.85em" }}>No tags yet — tags are extracted when you like or save a video</span>}
                      {tagList.map((tag) => (
                        <span key={tag} className="set-tag">
                          {tag}
                          <button className="set-tag-remove" onClick={() => removeTag(tag)}>&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="set-row" style={{ gap: "4px" }}>
                      <input className="set-tag-input" placeholder="Add a tag…" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
                      <button className="set-opt" onClick={addTag}>Add</button>
                    </div>
                    <div className="set-row" style={{ marginTop: "8px" }}>
                      <div className="set-row-label">Tag exceptions (never extract)</div>
                    </div>
                    <div className="set-row" style={{ gap: "4px", flexWrap: "wrap" }}>
                      {excList.length === 0 && <span style={{ opacity: 0.5, fontSize: "0.85em" }}>No exceptions — add tags you never want extracted</span>}
                      {excList.map((exc) => (
                        <span key={exc} className="set-tag" style={{ borderColor: "var(--accent)" }}>
                          <i className="bi bi-slash-circle" style={{ fontSize: "0.7rem" }}></i>
                          {exc}
                          <button className="set-tag-remove" onClick={() => removeException(exc)}>&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="set-row" style={{ gap: "4px" }}>
                      <input className="set-tag-input" placeholder="Add exception…" value={excInput} onChange={(e) => setExcInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addException()} />
                      <button className="set-opt" onClick={addException}>Add</button>
                    </div>
                  </>
                )}
                {section.id === "privacy" && (
                  <div className="set-row">
                    <div className="set-row-label">Delete all data</div>
                    <button className="set-opt danger" onClick={resetAll}>
                      <i className="bi bi-trash3"></i>
                      Delete all
                    </button>
                  </div>
                )}
                {section.id === "privacy" && (
                  <div className="set-storage">
                    <div className="set-storage-path">
                      <i className="bi bi-folder2-open"></i>
                      ~/.singularity/
                    </div>
                    <div className="set-storage-tree">
                      <span>├── ui-settings.json</span>
                      <span>├── history.json</span>
                      <span>├── watch-history.json</span>
                      <span>├── bookmarks.json</span>
                      <span>├── likes.json</span>
                      <span>├── playlists.json</span>
                      <span>└── tags.json</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
