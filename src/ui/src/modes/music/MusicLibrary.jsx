import { useState, useEffect } from 'react'

function escHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export default function MusicLibrary({ albums, loadAlbums, openAlbum, onCreateAlbum }) {
  useEffect(() => { loadAlbums() }, [])

  return (
    <div className="tab-panel active" id="tab-library">
      <div id="libraryMusic">
        <div className="tab-label">Albums</div>
        <button className="action-btn"
          style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
          onClick={onCreateAlbum}>
          <i className="bi bi-plus-circle"></i>
          <span>New Album</span>
        </button>
        <div id="albumsGrid">
          {albums.length === 0 ? (
            <div className="history-empty">No albums yet</div>
          ) : (
            albums.map(a => (
              <div key={a.id} className="album-card" onClick={() => openAlbum(a.id)}>
                <img src={a.thumbnail || ''} alt="" loading="lazy"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2230%22>📀</text></svg>"
                  }} />
                <div className="album-card-body">
                  <h4>{escHtml(a.name)}</h4>
                  <span>{a.tracks ? a.tracks.length : 0} tracks</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
