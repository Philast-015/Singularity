import { useState, useEffect } from 'react'

function escHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export default function AlbumDetail({ visible, albumId, albums, onClose, onSave, playMusicQueue }) {
  const album = albums.find(a => a.id === albumId)
  const tracks = album?.tracks || []

  function handleTrackClick(track) {
    playMusicQueue(tracks, tracks.indexOf(track))
  }

  async function removeTrack(trackId) {
    if (!album) return
    const updated = albums.map(a => {
      if (a.id === albumId) {
        return { ...a, tracks: a.tracks.filter(t => t.id !== trackId) }
      }
      return a
    })
    await onSave(updated)
  }

  async function deleteAlbum() {
    if (!album) return
    if (!confirm(`Delete album "${album.name}"?`)) return
    const updated = albums.filter(a => a.id !== albumId)
    await onSave(updated)
    onClose()
  }

  if (!visible || !album) return null

  return (
    <div id="albumDetail">
      <div className="album-detail-inner">
        <div className="album-detail-header">
          <button className="ctrl-btn" id="albumDetailBack" onClick={onClose}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <span id="albumDetailName">{album.name}</span>
          <button className="ctrl-btn" id="albumDetailDelete" title="Delete album" onClick={deleteAlbum}>
            <i className="bi bi-trash"></i>
          </button>
        </div>
        <div className="album-detail-actions">
          <button className="action-btn" style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => { if (tracks.length) playMusicQueue(tracks, 0) }}>
            <i className="bi bi-play-fill"></i> Play All
          </button>
          <button className="action-btn" style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => {
              if (tracks.length) {
                const copy = [...tracks]
                for (let i = copy.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1))
                  ;[copy[i], copy[j]] = [copy[j], copy[i]]
                }
                playMusicQueue(copy, 0)
              }
            }}>
            <i className="bi bi-shuffle"></i> Shuffle
          </button>
        </div>
        <div id="albumTrackList" className="album-track-list">
          {tracks.length === 0 ? (
            <div className="history-empty">No tracks in this album</div>
          ) : (
            tracks.map((t, i) => (
              <div key={t.id} className="album-track"
                onClick={(e) => {
                  if (e.target.closest('.track-remove')) return
                  handleTrackClick(t)
                }}>
                <span className="track-num">{i + 1}</span>
                <img src={t.thumbnail || ''} alt="" loading="lazy" />
                <div className="track-info">
                  <h4>{escHtml(t.title)}</h4>
                  <span>{escHtml(t.channel || '')}</span>
                </div>
                <span className="track-dur">{t.duration || ''}</span>
                <button className="track-remove" onClick={() => removeTrack(t.id)}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
