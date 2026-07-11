import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchData, saveData } from "../api";
import logo from "../logo.png";

function PlaylistRow({
  title,
  icon,
  items = [],
  onClickItem,
  onCreate,
  linkTo,
}) {
  const navigate = useNavigate();
  return (
    <section className="lib-section">
      <div className="lib-section-header">
        <h2 className="lib-section-title">
          {icon && <i className={icon}></i>} {title}
        </h2>
        {onCreate && (
          <button className="lib-create-btn" onClick={onCreate}>
            <i className="bi bi-plus-lg"></i> New
          </button>
        )}
        {linkTo && items.length > 0 && (
          <button className="lib-see-all" onClick={() => navigate(linkTo)}>
            See all
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="lib-empty">
          {title === "Playlists"
            ? "No playlists yet. Create one!"
            : "No videos"}
        </div>
      ) : (
        <div className="lib-hscroll">
          {items.map((v) => (
            <div
              key={v.id}
              className="lib-hitem"
              onClick={() => onClickItem(v)}
            >
              <img src={v.thumbnail} alt="" loading="lazy" />
              <div className="lib-hitem-info">
                <span className="lib-hitem-title">{v.title || ""}</span>
                <span className="lib-hitem-channel">{v.channel || ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UserPlaylistCard({ playlist, onClick }) {
  return (
    <div className="lib-pl-card" onClick={onClick}>
      <div className="lib-pl-card-thumb">
        {playlist.items.length > 0 ? (
          <img src={playlist.items[0].thumbnail} alt="" />
        ) : (
          <div className="lib-pl-card-empty">
            <i className="bi bi-music-note-list"></i>
          </div>
        )}
        <span className="lib-pl-card-count">{playlist.items.length}</span>
      </div>
      <div className="lib-pl-card-info">
        <span className="lib-pl-card-name">{playlist.name}</span>
      </div>
    </div>
  );
}

export default function LibraryPage({
  musicMode,
  onToggleMusic,
  openVideo,
  openMusicTrack,
  albums,
  loadAlbums,
  openAlbum,
}) {
  const navigate = useNavigate();
  const [likes, setLikes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchData("likes").then((d) => setLikes(Array.isArray(d) ? d : []));
    fetchData("bookmarks").then((d) => setBookmarks(Array.isArray(d) ? d : []));
    fetchData("playlists").then((d) => setPlaylists(Array.isArray(d) ? d : []));
    fetchData("watch-history").then((d) =>
      setWatchHistory(Array.isArray(d) ? d.slice(0, 20) : []),
    );
    if (musicMode) loadAlbums();
  }, [musicMode, loadAlbums]);

  async function createPlaylist() {
    if (!newName.trim()) return;
    let list = await fetchData("playlists");
    if (!Array.isArray(list)) list = [];
    list.push({
      id: "pl_" + Date.now(),
      name: newName.trim(),
      items: [],
    });
    await saveData("playlists", list);
    setPlaylists(list);
    setNewName("");
    setShowCreate(false);
  }

  function handleItemClick(v) {
    if (musicMode) openMusicTrack({ id: v.id });
    else
      openVideo({ id: v.id, url: `https://www.youtube.com/watch?v=${v.id}` });
  }

  if (musicMode) {
    return (
      <div id="libraryPage">
        <div className="lib-header">
          <button className="lib-back" onClick={() => navigate("/")}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <h1>Music Library</h1>
        </div>
        <div className="lib-body">
          <div className="lib-mode-tabs">
            <button className="lib-mode-tab active">
              <i className="bi bi-music-note-beamed"></i>Music
            </button>
            <button
              className="lib-mode-tab"
              onClick={() => onToggleMusic(false)}
            >
              <img src={logo} alt="" style={{width:'16px',height:'16px',borderRadius:'3px',objectFit:'cover',verticalAlign:'-2px'}} /> YouTube
            </button>
          </div>

          <div className="lib-album-toolbar">
            <span className="lib-section-title">Albums</span>
            <button
              className="lib-create-btn"
              onClick={() => {
                document.dispatchEvent(new CustomEvent("open-create-album"));
              }}
            >
              <i className="bi bi-plus-lg"></i> New Album
            </button>
          </div>

          {albums.length === 0 ? (
            <div className="lib-empty">No albums yet</div>
          ) : (
            <div id="albumsGrid" className="lib-album-grid">
              {albums.map((a) => (
                <div
                  key={a.id}
                  className="album-card"
                  onClick={() => openAlbum(a.id)}
                >
                  <img src={a.thumbnail || ""} alt="" />
                  <div className="album-card-body">
                    <h4>{a.name}</h4>
                    <span>{(a.tracks || []).length} tracks</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="libraryPage">
      <div className="lib-header">
        <button className="lib-back" onClick={() => navigate("/")}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1>Library</h1>
      </div>
      <div className="lib-body">
        <div className="lib-mode-tabs">
          <button className="lib-mode-tab" onClick={() => onToggleMusic(true)}>
            <i className="bi bi-music-note-beamed"></i> Music
          </button>
          <button className="lib-mode-tab active">
            <img src={logo} alt="" style={{width:'16px',height:'16px',borderRadius:'3px',objectFit:'cover',verticalAlign:'-2px'}} />YouTube
          </button>
        </div>

        <PlaylistRow
          title="Watch history"
          icon="bi bi-clock-history"
          items={watchHistory}
          onClickItem={handleItemClick}
        />

        <section className="lib-section">
          <div className="lib-section-header">
            <h2 className="lib-section-title">
              <i className="bi bi-collection-play"></i> Playlists
            </h2>
            <button
              className="lib-create-btn"
              onClick={() => setShowCreate(true)}
            >
              <i className="bi bi-plus-lg"></i> New
            </button>
          </div>

          <div className="lib-pl-grid">
            <div
              className="lib-pl-card lib-pl-system"
              onClick={() => navigate("/library/liked")}
            >
              <div className="lib-pl-card-thumb">
                <i className="bi bi-heart"></i>
                <span className="lib-pl-card-count">{likes.length}</span>
              </div>
              <div className="lib-pl-card-info">
                <span className="lib-pl-card-name">Liked videos</span>
              </div>
            </div>

            <div
              className="lib-pl-card lib-pl-system"
              onClick={() => navigate("/library/saved")}
            >
              <div className="lib-pl-card-thumb">
                <i className="bi bi-bookmark"></i>
                <span className="lib-pl-card-count">{bookmarks.length}</span>
              </div>
              <div className="lib-pl-card-info">
                <span className="lib-pl-card-name">Saved videos</span>
              </div>
            </div>

            {playlists.map((p) => (
              <UserPlaylistCard
                key={p.id}
                playlist={p}
                onClick={() => navigate(`/library/playlist/${p.id}`)}
              />
            ))}
          </div>
        </section>

        {showCreate && (
          <div
            className="lib-create-overlay"
            onClick={() => setShowCreate(false)}
          >
            <div
              className="lib-create-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>New playlist</h3>
              <input
                type="text"
                placeholder="Playlist name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createPlaylist();
                }}
                autoFocus
              />
              <div className="lib-create-actions">
                <button
                  className="lib-cancel-btn"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </button>
                <button className="lib-confirm-btn" onClick={createPlaylist}>
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
