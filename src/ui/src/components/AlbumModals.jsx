import { useState, useEffect } from 'react'
import { fetchData } from '../api'

function escHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export default function AlbumModals({
  createVisible, setCreateVisible, addVisible, setAddVisible,
  albums, onSave, currentTrack, loadAlbums,
}) {
  const [albumName, setAlbumName] = useState('')

  async function createAlbum() {
    const name = albumName.trim()
    if (!name) return
    const album = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      created: Date.now(),
      thumbnail: '',
      tracks: [],
    }
    const updated = [album, ...albums]
    await onSave(updated)
    setAlbumName('')
    setCreateVisible(false)
  }

  async function addToAlbum(albumId) {
    if (!currentTrack) return
    const album = albums.find(a => a.id === albumId)
    if (!album) return
    if (!album.tracks) album.tracks = []
    if (album.tracks.some(t => t.id === currentTrack.id)) return
    album.tracks.push({
      id: currentTrack.id,
      title: currentTrack.title,
      channel: currentTrack.channel,
      thumbnail: currentTrack.thumbnail,
      duration: '',
    })
    const updated = albums.map(a => a.id === albumId ? album : a)
    await onSave(updated)
    setAddVisible(false)
  }

  if (createVisible) {
    return (
      <>
        <div className="modal-backdrop" onClick={() => setCreateVisible(false)}></div>
        <div className="modal-panel">
          <div className="modal-header">
            <span>New Album</span>
            <button className="ctrl-btn" onClick={() => setCreateVisible(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="modal-body">
            <input type="text" placeholder="Album name..." maxLength={100}
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createAlbum() }}
              autoFocus />
            <div className="modal-actions">
              <button className="action-btn" onClick={() => setCreateVisible(false)}>Cancel</button>
              <button className="action-btn"
                style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
                onClick={createAlbum}>Create</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (addVisible) {
    return (
      <>
        <div className="modal-backdrop" onClick={() => setAddVisible(false)}></div>
        <div className="modal-panel">
          <div className="modal-header">
            <span>Add to Album</span>
            <button className="ctrl-btn" onClick={() => setAddVisible(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="modal-body">
            <div id="addAlbumList">
              {albums.length === 0 ? (
                <div className="history-empty">No albums. Create one first.</div>
              ) : (
                albums.map(a => (
                  <div key={a.id} className="add-album-item" onClick={() => addToAlbum(a.id)}>
                    <strong>{escHtml(a.name)}</strong>
                    <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}> — {a.tracks ? a.tracks.length : 0} tracks</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  return null
}
