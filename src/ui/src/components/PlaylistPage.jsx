import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchData, saveData } from '../api'

export default function PlaylistPage({ openVideo, openMusicTrack, musicMode }) {
  const { playlistId } = useParams()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState(null)

  const load = useCallback(async () => {
    const list = await fetchData('playlists')
    const arr = Array.isArray(list) ? list : []
    const p = arr.find(p => p.id === playlistId)
    setPlaylist(p || null)
  }, [playlistId])

  useEffect(() => { load() }, [load])

  async function removeItem(videoId) {
    let list = await fetchData('playlists')
    if (!Array.isArray(list)) list = []
    const idx = list.findIndex(p => p.id === playlistId)
    if (idx === -1) return
    list[idx].items = (list[idx].items || []).filter(v => v.id !== videoId)
    await saveData('playlists', list)
    setPlaylist({ ...list[idx] })
  }

  async function deletePlaylist() {
    let list = await fetchData('playlists')
    if (!Array.isArray(list)) list = []
    list = list.filter(p => p.id !== playlistId)
    await saveData('playlists', list)
    navigate('/library')
  }

  function handleClick(v) {
    if (musicMode) openMusicTrack({ id: v.id })
    else openVideo({ id: v.id, url: `https://www.youtube.com/watch?v=${v.id}` })
  }

  if (!playlist) {
    return (
      <div id="libraryPage">
        <div className="lib-header">
          <button className="lib-back" onClick={() => navigate('/library')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <h1>Playlist not found</h1>
        </div>
      </div>
    )
  }

  return (
    <div id="libraryPage">
      <div className="lib-header">
        <button className="lib-back" onClick={() => navigate('/library')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1>{playlist.name}</h1>
        <button className="lib-del-playlist" onClick={deletePlaylist}
          title="Delete playlist">
          <i className="bi bi-trash"></i>
        </button>
      </div>
      <div className="lib-body">
        {playlist.items.length === 0 ? (
          <div className="lib-empty">This playlist is empty</div>
        ) : (
          <div className="lib-vertical-list">
            {playlist.items.map(v => (
              <div key={v.id} className="lib-vitem"
                onClick={(e) => {
                  if (e.target.closest('.lib-vremove')) return
                  handleClick(v)
                }}>
                <img src={v.thumbnail} alt="" loading="lazy" />
                <div className="lib-vitem-info">
                  <span className="lib-vitem-title">{v.title || ''}</span>
                  <span className="lib-vitem-channel">{v.channel || ''}</span>
                </div>
                <button className="lib-vremove"
                  onClick={(e) => { e.stopPropagation(); removeItem(v.id) }}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
