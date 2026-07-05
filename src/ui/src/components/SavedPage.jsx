import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchData, saveData } from '../api'

export default function SavedPage({ openVideo, openMusicTrack, musicMode }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    const d = await fetchData('bookmarks')
    setItems(Array.isArray(d) ? d : [])
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(id) {
    let list = await fetchData('bookmarks')
    if (!Array.isArray(list)) list = []
    list = list.filter(v => v.id !== id)
    await saveData('bookmarks', list)
    load()
  }

  function handleClick(v) {
    if (musicMode) openMusicTrack({ id: v.id })
    else openVideo({ id: v.id, url: `https://www.youtube.com/watch?v=${v.id}` })
  }

  return (
    <div id="libraryPage">
      <div className="lib-header">
        <button className="lib-back" onClick={() => navigate('/library')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1>Saved videos</h1>
      </div>
      <div className="lib-body">
        {items.length === 0 ? (
          <div className="lib-empty">No saved videos yet</div>
        ) : (
          <div className="lib-vertical-list">
            {items.map(v => (
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
                  onClick={(e) => { e.stopPropagation(); remove(v.id) }}>
                  <i className="bi bi-bookmark-x"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
