import { useState, useEffect, useCallback } from 'react'
import { fetchData, saveData } from '../api'

function SavedList({ title, fetchName, openVideo, openMusicTrack, musicMode }) {
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    setItems(await fetchData(fetchName))
  }, [fetchName])

  useEffect(() => { load() }, [load])

  async function remove(id) {
    let list = await fetchData(fetchName)
    list = list.filter(v => v.id !== id)
    await saveData(fetchName, list)
    load()
  }

  return (
    <>
      <div className="tab-label">{title}</div>
      <div className="saved-grid">
        {items.length === 0 ? (
          <div className="history-empty">No {title.toLowerCase()}</div>
        ) : (
          items.map(v => (
            <div key={v.id} className="saved-item" data-id={v.id}
              onClick={(e) => {
                if (e.target.closest('.saved-remove')) return
                if (musicMode) openMusicTrack({ id: v.id })
                else openVideo({ id: v.id, url: `https://www.youtube.com/watch?v=${v.id}` })
              }}>
              <img src={v.thumbnail} alt="" loading="lazy" />
              <div className="saved-info">
                <h4>{v.title || ''}</h4>
                <span>{v.channel || ''}</span>
              </div>
              <button className="saved-remove" onClick={(e) => { e.stopPropagation(); remove(v.id) }}>
                <i className="bi bi-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}

export default function SavedItems({ openVideo, openMusicTrack, musicMode }) {
  return (
    <div className="tab-panel active" id="tab-library">
      <div id="libraryNormal">
        <SavedList title="Watch history" fetchName="watch-history" openVideo={openVideo} openMusicTrack={openMusicTrack} musicMode={musicMode} />
        <div style={{ marginTop: 16 }}>
          <SavedList title="Saved videos" fetchName="bookmarks" openVideo={openVideo} openMusicTrack={openMusicTrack} musicMode={musicMode} />
        </div>
        <div style={{ marginTop: 16 }}>
          <SavedList title="Liked videos" fetchName="likes" openVideo={openVideo} openMusicTrack={openMusicTrack} musicMode={musicMode} />
        </div>
      </div>
    </div>
  )
}
