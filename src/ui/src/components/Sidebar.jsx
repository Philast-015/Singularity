import { useLocation, useNavigate } from 'react-router-dom'

export default function Sidebar({
  musicMode, onToggleMusic,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  function isActive(p) {
    if (p === '/') return path === '/'
    return path.startsWith(p)
  }

  return (
    <div id="collapsed-sidebar">
      <button className={`sidebar-icon ${isActive('/') ? 'active' : ''}`}
        title="Home" onClick={() => navigate('/')}>
        <i className="bi bi-house"></i>
      </button>
      <button className={`sidebar-icon ${isActive('/library') ? 'active' : ''}`}
        id="libraryBtn" title="Library"
        onClick={() => navigate('/library')}>
        <i className="bi bi-collection"></i>
      </button>
      <label className="sidebar-switch" id="musicModeLabel" title="Music Mode">
        <input id="musicModeSwitch" type="checkbox" checked={musicMode}
          onChange={(e) => onToggleMusic(e.target.checked)} />
        <div className="sidebar-switch-track">
          <div className="sidebar-switch-knob">
            <i className="bi bi-music-note-beamed"></i>
          </div>
        </div>
      </label>
      <button className={`sidebar-icon ${isActive('/settings') ? 'active' : ''}`}
        id="sidebarSettingsBtn" title="Settings"
        onClick={() => navigate('/settings')}>
        <i className="bi bi-gear"></i>
      </button>
    </div>
  )
}
