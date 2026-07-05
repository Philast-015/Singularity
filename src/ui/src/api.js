export const API_BASE = '';

async function jsonOrThrow(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(res.ok ? 'Invalid response' : `Server error (${res.status})`);
  }
}

export async function searchYouTube(query) {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
  const data = await jsonOrThrow(res);
  if (!res.ok) throw new Error(data.error || 'Search failed');
  return data;
}

export async function getVideoInfo(url) {
  const res = await fetch(`${API_BASE}/api/info?url=${encodeURIComponent(url)}`);
  const data = await jsonOrThrow(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load video');
  return data;
}

export async function fetchData(name) {
  try {
    const res = await fetch(`${API_BASE}/api/data/${name}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveData(name, data) {
  try {
    await fetch(`${API_BASE}/api/data/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}

export async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    return await res.json();
  } catch {
    return {};
  }
}

export async function saveSettingsToServer(s) {
  fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  }).catch(() => {});
}

export async function fetchRadio(query) {
  try {
    const res = await fetch(`${API_BASE}/api/radio?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function fetchRecommend() {
  try {
    const res = await fetch(`${API_BASE}/api/recommend`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function extractTags(videoId, liked = false) {
  try {
    const res = await fetch(`${API_BASE}/api/extract-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, liked }),
    });
    return await res.json();
  } catch {
    return { tags: [] };
  }
}

export async function fetchTagExceptions() {
  try {
    const res = await fetch(`${API_BASE}/api/tag-exceptions`);
    const data = await res.json();
    return data.exceptions || [];
  } catch {
    return [];
  }
}

export async function saveTagExceptions(exceptions) {
  try {
    const res = await fetch(`${API_BASE}/api/tag-exceptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exceptions),
    });
    return await res.json();
  } catch {
    return { exceptions: [] };
  }
}

export async function fetchTags() {
  try {
    const res = await fetch(`${API_BASE}/api/tags`);
    const data = await res.json();
    return data.tags || [];
  } catch {
    return [];
  }
}

export async function saveUserTags(tags) {
  try {
    await fetch(`${API_BASE}/api/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
  } catch {}
}

export function formatTime(s) {
  if (isNaN(s) || s === Infinity) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function formatViews(views) {
  if (!views) return '';
  if (views >= 1e9) return (views / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (views >= 1e6) return (views / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (views >= 1e3) return (views / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return views.toString();
}
