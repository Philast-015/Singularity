import { useState, useEffect, useRef } from 'react'
import { API_BASE, formatTime, fetchRadio } from '../api'

export default function MusicPlayer({
  visible, currentTrack, musicAudio, musicQueue, queueIndex,
  setQueueIndex, setCurrentTrack, setMusicQueue, onClose, onAddToAlbum,
}) {
  const [shuffleOn, setShuffleOn] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [maximized, setMaximized] = useState(false)
  const [radioResults, setRadioResults] = useState([])
  const dockProgressRef = useRef(null)
  const maxProgressRef = useRef(null)

  useEffect(() => {
    if (!visible || !currentTrack) return
    musicAudio.src = `${API_BASE}/api/stream?url=${encodeURIComponent(currentTrack.audio_url || '')}`
    musicAudio.play().catch(() => {})
  }, [currentTrack, visible])

  useEffect(() => {
    if (!visible) return
    const a = musicAudio
    const onTime = () => {
      setCurrentTime(a.currentTime)
      setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
    }
    const onMeta = () => setDuration(a.duration)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => playNext()
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnded)
    }
  }, [visible])

  useEffect(() => {
    if (!maximized) {
      document.body.classList.remove('music-maximized')
      return
    }
    document.body.classList.add('music-maximized')
    if (currentTrack?.title) {
      fetchRadio(currentTrack.title).then(setRadioResults)
    }
    return () => document.body.classList.remove('music-maximized')
  }, [maximized, currentTrack?.title])

  function togglePlay() {
    if (musicAudio.paused) musicAudio.play()
    else musicAudio.pause()
  }

  function playNext() {
    if (musicQueue.length === 0) return
    let next = queueIndex + 1
    if (shuffleOn) next = Math.floor(Math.random() * musicQueue.length)
    if (next >= musicQueue.length) {
      if (shuffleOn) next = 0
      else { onClose(); return }
    }
    setQueueIndex(next)
    setCurrentTrack(musicQueue[next])
  }

  function playPrev() {
    if (musicQueue.length === 0) return
    let prev = queueIndex - 1
    if (prev < 0) prev = musicQueue.length - 1
    setQueueIndex(prev)
    setCurrentTrack(musicQueue[prev])
  }

  function handleProgressClick(e, ref) {
    if (!musicAudio.duration || !ref?.current) return
    const rect = ref.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    musicAudio.currentTime = pct * musicAudio.duration
  }

  function seekTrack(idx) {
    if (idx < 0 || idx >= musicQueue.length) return
    setQueueIndex(idx)
    setCurrentTrack(musicQueue[idx])
  }

  useEffect(() => {
    function handler(e) {
      if (!visible) return
      if (e.target.matches('input, textarea, [contenteditable]')) return
      switch (e.key) {
        case ' ':
          e.preventDefault(); togglePlay(); break
        case 'ArrowLeft':
          e.preventDefault(); musicAudio.currentTime = Math.max(0, musicAudio.currentTime - 5); break
        case 'ArrowRight':
          e.preventDefault(); musicAudio.currentTime = Math.min(musicAudio.duration, musicAudio.currentTime + 5); break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible])

  if (!visible) return null

  const trackList = musicQueue.map((t, i) => ({ ...t, index: i }))

  return (
    <>
      <div id="musicPlayer" className={maximized ? 'hidden-dock' : ''}>
        <div className="dock-progress" ref={dockProgressRef} onClick={(e) => handleProgressClick(e, dockProgressRef)}>
          <div className="dock-progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="dock-body" onClick={() => setMaximized(true)}>
          <div className="dock-left">
            <img id="musicArt" src={currentTrack?.thumbnail || ''} alt=""
              className="dock-art"
              onError={(e) => {
                e.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2230%22>🎵</text></svg>"
              }} />
            <div className="dock-text">
              <span id="musicTrackTitle" className="dock-title">{currentTrack?.title || 'Track Title'}</span>
              <span id="musicTrackChannel" className="dock-channel">{currentTrack?.channel || 'Channel'}</span>
            </div>
          </div>
          <div className="dock-center" onClick={e => e.stopPropagation()}>
            <button className="dock-btn" id="musicPrevBtn" title="Previous" onClick={playPrev}>
              <i className="bi bi-skip-start-fill"></i>
            </button>
            <button className="dock-btn dock-play-btn" id="musicPlayBtn" title="Play/Pause" onClick={togglePlay}>
              <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
            </button>
            <button className="dock-btn" id="musicNextBtn" title="Next" onClick={playNext}>
              <i className="bi bi-skip-end-fill"></i>
            </button>
          </div>
          <div className="dock-right" onClick={e => e.stopPropagation()}>
            <span className="dock-time">
              <span id="musicCurrentTime">{formatTime(currentTime)}</span> / <span id="musicTotalTime">{formatTime(duration)}</span>
            </span>
            <button className={`dock-btn ${shuffleOn ? 'active' : ''}`} id="musicShuffleBtn" title="Shuffle"
              onClick={() => setShuffleOn(s => !s)}>
              <i className="bi bi-shuffle"></i>
            </button>
            <div className="dock-volume">
              <button className="dock-btn" id="musicMuteBtn" onClick={() => {
                musicAudio.muted = !musicAudio.muted
                setMuted(musicAudio.muted)
              }}>
                <i className={`bi ${muted ? 'bi-volume-mute-fill' : 'bi-volume-up-fill'}`}></i>
              </button>
              <input type="range" id="musicVolume" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setVolume(val)
                  musicAudio.volume = val
                  musicAudio.muted = false
                  setMuted(false)
                }} />
            </div>
            <button className="dock-btn" id="musicAddToAlbum" title="Add to Album" onClick={onAddToAlbum}>
              <i className="bi bi-plus-circle"></i>
            </button>
            <button className="dock-btn" id="musicPlayerClose" title="Stop" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>

      {maximized && (
        <div id="musicMaximized">
          <div className="mm-header">
            <button className="mm-back" onClick={() => setMaximized(false)}>
              <i className="bi bi-chevron-down"></i>
            </button>
            <span className="mm-header-title">Now Playing</span>
            <button className="mm-close" title="Stop" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="mm-body">
            <div className="mm-art-section">
              <img src={currentTrack?.thumbnail || ''} alt="" className="mm-art"
                onError={(e) => {
                  e.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23333%22 width=%22200%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2260%22>🎵</text></svg>"
                }} />
            </div>

            <div className="mm-info">
              <h2 className="mm-title">{currentTrack?.title || 'Track Title'}</h2>
              <span className="mm-channel">{currentTrack?.channel || 'Channel'}</span>
            </div>

            <div className="mm-progress-area">
              <div className="mm-progress" ref={maxProgressRef} onClick={(e) => handleProgressClick(e, maxProgressRef)}>
                <div className="mm-progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="mm-time-row">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mm-controls">
              <button className={`mm-ctrl-btn ${shuffleOn ? 'active' : ''}`} title="Shuffle"
                onClick={() => setShuffleOn(s => !s)}>
                <i className="bi bi-shuffle"></i>
              </button>
              <button className="mm-ctrl-btn" title="Previous" onClick={playPrev}>
                <i className="bi bi-skip-start-fill"></i>
              </button>
              <button className="mm-ctrl-btn mm-play-btn" title="Play/Pause" onClick={togglePlay}>
                <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
              </button>
              <button className="mm-ctrl-btn" title="Next" onClick={playNext}>
                <i className="bi bi-skip-end-fill"></i>
              </button>
              <div className="mm-volume-wrap">
                <button className="mm-ctrl-btn" title="Mute" onClick={() => {
                  musicAudio.muted = !musicAudio.muted
                  setMuted(musicAudio.muted)
                }}>
                  <i className={`bi ${muted ? 'bi-volume-mute-fill' : 'bi-volume-up-fill'}`}></i>
                </button>
                <input type="range" className="mm-volume-slider" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    setVolume(val)
                    musicAudio.volume = val
                    musicAudio.muted = false
                    setMuted(false)
                  }} />
              </div>
              <button className="mm-ctrl-btn" title="Add to Album" onClick={onAddToAlbum}>
                <i className="bi bi-plus-circle"></i>
              </button>
            </div>

            {trackList.length > 0 && (
              <div className="mm-queue">
                <h3 className="mm-queue-title">Queue</h3>
                <div className="mm-queue-list">
                  {trackList.map(t => (
                    <div key={t.index} className={`mm-queue-item ${t.index === queueIndex ? 'active' : ''}`}
                      onClick={() => seekTrack(t.index)}>
                      <img src={t.thumbnail || ''} alt="" className="mm-queue-thumb" />
                      <div className="mm-queue-info">
                        <span className="mm-queue-name">{t.title || ''}</span>
                        <span className="mm-queue-channel">{t.channel || ''}</span>
                      </div>
                      <span className="mm-queue-idx">{t.index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {radioResults.length > 0 && (
              <div className="mm-queue">
                <h3 className="mm-queue-title">Related tracks</h3>
                <div className="mm-queue-list">
                  {radioResults.map(t => (
                    <div key={t.id} className="mm-queue-item" onClick={() => {
                      setMusicQueue([...musicQueue.slice(queueIndex + 1), t])
                      setQueueIndex(queueIndex)
                    }}>
                      <img src={t.thumbnail || ''} alt="" className="mm-queue-thumb" />
                      <div className="mm-queue-info">
                        <span className="mm-queue-name">{t.title || ''}</span>
                        <span className="mm-queue-channel">{t.channel || ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
