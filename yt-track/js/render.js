// render.js — shared UI builders (progress bars, video tables, playlist cards).
function renderProgressBar(percent) {
  const p = Math.max(0, Math.min(100, percent));
  return '<div class="progress"><div class="progress-fill" style="width:' + p + '%"></div><span>' + p + '% watched</span></div>';
}

// ---------- Inline YouTube player ----------
function youtubeVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0].split('?')[0];
      return id && id.match(/^[A-Za-z0-9_-]{6,}$/) ? id : null;
    }
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v && v.match(/^[A-Za-z0-9_-]{6,}$/)) return v;
      const listMatch = u.searchParams.get('list');
      // not video id
      const shorts = u.pathname.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
      if (shorts) return shorts[1];
      const embed = u.pathname.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
      if (embed) return embed[1];
      return null;
    }
  } catch (e) {}
  const m = String(url).match(/[?&]v=([A-Za-z0-9_-]{6,})/)
        || String(url).match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)
        || String(url).match(/\/shorts\/([A-Za-z0-9_-]{6,})/)
        || String(url).match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function youtubeThumbnailUrl(url, quality) {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const q = quality || 'mqdefault';
  return 'https://img.youtube.com/vi/' + encodeURIComponent(id) + '/' + q + '.jpg';
}

function openVideoPlayer(url, opts) {
  opts = opts || {};
  window.currentPlayerProgress = opts.onProgress || null;
  const id = youtubeVideoId(url);
  const overlay = document.getElementById('player-overlay');
  const frame = document.getElementById('player-frame');
  const pp = document.getElementById('player-progress-info');
  const ppTime = document.getElementById('pp-time');
  if (!id || !overlay || !frame) return false;
  if (window.ytPlayerTimer) { try { clearInterval(window.ytPlayerTimer); } catch (e) {} window.ytPlayerTimer = null; }
  if (window.ytPlayer && window.ytPlayer.destroy) { try { window.ytPlayer.destroy(); } catch (e) {} window.ytPlayer = null; }
  frame.innerHTML = '<div id="yt-player"></div>';
  if (pp && ppTime) { pp.classList.add('hidden'); ppTime.textContent = ''; }
  function onReady(ev) {
    if (opts.start && opts.start > 0) {
      try {
        ev.target.seekTo(opts.start, true);
      } catch (e) {}
      // save immediately after seeking so reload gets it
      try {
        const t = ev.target.getCurrentTime ? ev.target.getCurrentTime() : opts.start;
        if (opts.onProgress && typeof opts.onProgress === 'function') {
          opts.onProgress(Math.floor(t));
        }
      } catch (e) {}
    }
    // start timer
    if (window.ytPlayerTimer) { try { clearInterval(window.ytPlayerTimer); } catch (e) {} }
    window.ytPlayerTimer = setInterval(function() {
      try {
        if (!window.ytPlayer || typeof window.ytPlayer.getCurrentTime !== 'function') return;
        const t = window.ytPlayer.getCurrentTime();
              if (opts.onProgress && typeof opts.onProgress === 'function') {
                try { opts.onProgress(Math.floor(t)); } catch (e) {}
              }
        if (pp && ppTime) { pp.classList.remove('hidden'); ppTime.textContent = Math.floor(t) + 's'; }
      } catch (e) {}
    }, 1000);
  }
  function onStateChange(ev) {
    const YT = window.YT;
    if (YT && YT.PlayerState) {
      if (ev.data === YT.PlayerState.PLAYING) {
        if (window.ytPlayerTimer) { try { clearInterval(window.ytPlayerTimer); } catch (e) {} window.ytPlayerTimer = null; }
          window.ytPlayerTimer = setInterval(function() {
            try {
              if (!window.ytPlayer || typeof window.ytPlayer.getCurrentTime !== 'function') return;
              const t = window.ytPlayer.getCurrentTime();
              const ts = Math.floor(t);
              if (window.currentPlayerProgress && typeof window.currentPlayerProgress === 'function') {
                try { window.currentPlayerProgress(ts); } catch (e) {}
              }
              if (opts.onProgress && typeof opts.onProgress === 'function') {
                try { opts.onProgress(ts); } catch (e) {}
              }
              if (pp && ppTime) { pp.classList.remove('hidden'); ppTime.textContent = ts + 's'; }
            } catch (e) {}
          }, 500);
      }
      if (ev.data === YT.PlayerState.ENDED || ev.data === YT.PlayerState.PAUSED) {
        // save current position on pause/ended
        try {
          const t = window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function' ? window.ytPlayer.getCurrentTime() : 0;
              if (opts.onProgress && typeof opts.onProgress === 'function') {
                try { opts.onProgress(Math.floor(t), true); } catch (e) {}
              }
        } catch (e) {}
        if (window.ytPlayerTimer) { try { clearInterval(window.ytPlayerTimer); } catch (e) {} window.ytPlayerTimer = null; }
      }
    }
  }
  function createPlayer() {
    try {
      window.ytPlayer = new window.YT.Player('yt-player', {
        videoId: id,
        playerVars: { autoplay: 1, rel: 0 },
        events: { onReady: onReady, onStateChange: onStateChange }
      });
    } catch (e) {}
  }
  if (window.YT && window.YT.Player) { createPlayer(); }
  else {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = function() { createPlayer(); };
    const first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) first.parentNode.insertBefore(tag, first);
  }
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  return true;
}

function closeVideoPlayer() {
  // save final position before closing
  try {
    const t = (window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') ? window.ytPlayer.getCurrentTime() : 0;
    if (window.currentPlayerProgress && typeof window.currentPlayerProgress === 'function') {
      try { window.currentPlayerProgress(Math.floor(t), true); } catch (e) {}
    }
  } catch (e) {}
  if (window.ytPlayerTimer) { try { clearInterval(window.ytPlayerTimer); } catch (e) {} window.ytPlayerTimer = null; }
  if (window.ytPlayer && window.ytPlayer.destroy) { try { window.ytPlayer.destroy(); } catch (e) {} window.ytPlayer = null; }
  window.currentPlayerProgress = null;
  window._currentLinkId = null;
  const overlay = document.getElementById('player-overlay');
  const frame = document.getElementById('player-frame');
  if (overlay) overlay.classList.add('hidden');
  if (frame) frame.innerHTML = '';
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#player-close')) closeVideoPlayer();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeVideoPlayer();
});

function renderVideoRow(video) {
  const watched = video.status === 'watched';
  return '<div class="video-row" data-video-id="' + video.id + '">'
    + '<div class="video-main">'
    +   '<a class="video-title" href="' + esc(video.youtube_url) + '" target="_blank" rel="noopener">' + esc(video.title) + '</a>'
    +   '<span class="video-duration">' + esc(video.duration) + '</span>'
    + '</div>'
    + '<div class="video-actions">'
    +   '<span class="status-pill ' + (watched ? 'watched' : 'unwatched') + '">' + (watched ? 'Watched' : 'Not watched') + '</span>'
    +   '<button class="btn btn-small ' + (watched ? 'btn-outline' : 'btn-primary') + ' toggle-status">' + (watched ? 'Mark unread' : 'Mark watched') + '</button>'
    + '</div>'
    + '</div>';
}

function renderVideoTable(videos, container) {
  container.innerHTML = videos.length
    ? videos.map(renderVideoRow).join('')
    : '<p class="empty">No videos in this playlist yet.</p>';
}

function renderPlaylistCard(playlist, selected) {
  const pct = percentFromCounts(playlist.watchedCount, playlist.videoCount);
  return '<div class="playlist-card' + (selected ? ' selected' : '') + '" data-playlist-id="' + playlist.id + '">'
    + '<div class="playlist-head">'
    +   '<div class="playlist-title">' + esc(playlist.title || 'Untitled playlist') + '</div>'
    +   (playlist.owner_email ? '<div class="playlist-owner">' + esc(playlist.owner_email) + '</div>' : '')
    + '</div>'
    + '<div class="playlist-meta">' + (playlist.videoCount || 0) + ' videos</div>'
    + renderProgressBar(pct)
    + '</div>';
}