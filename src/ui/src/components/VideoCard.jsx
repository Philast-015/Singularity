import { formatViews } from '../api'

export default function VideoCard({ video, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      <img
        src={video.thumbnail || ''}
        alt={video.title || ''}
        loading="lazy"
        onError={(e) => {
          e.target.style.display = 'none'
          e.target.parentElement.innerHTML = '<div style=display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:32px>🎬</div>'
        }}
      />
      <div className="card-body">
        <h3>{video.title || ''}</h3>
        <div className="channel">{video.channel || ''}</div>
        <div className="meta-row">
          <span>{video.views != null ? formatViews(video.views) + ' views' : ''}</span>
          <span>{video.duration || ''}</span>
        </div>
      </div>
    </div>
  )
}
