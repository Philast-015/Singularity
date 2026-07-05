export default function SearchHistory({ visible, history, onSelect }) {
  if (!visible) return null
  return (
    <div id="searchHistoryDropdown" style={{ position: 'relative', maxWidth: 500, margin: '0 auto' }}>
      <div id="searchHistoryList">
        {history.length === 0 ? (
          <div className="dropdown-empty">No recent searches</div>
        ) : (
          history.map((q, i) => (
            <div key={i} className="dropdown-item" onClick={() => onSelect(q)}>
              <i className="bi bi-clock-history"></i>
              <span>{q}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
