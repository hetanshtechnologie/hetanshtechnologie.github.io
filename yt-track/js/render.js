// render.js — shared UI builders (progress bars, video tables, playlist cards).
function renderProgressBar(percent) {
  const p = Math.max(0, Math.min(100, percent));
  return '<div class="progress"><div class="progress-fill" style="width:' + p + '%"></div><span>' + p + '% watched</span></div>';
}

// ---------- Inline YouTube player ----------
function youtubeVideoId(url) {
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/)
        || url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)
        || url.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function openVideoPlayer(url) {
  const id = youtubeVideoId(url);
  const overlay = document.getElementById('player-overlay');
  const frame = document.getElementById('player-frame');
  if (!id || !overlay || !frame) return false;
  frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id)
    + '?autoplay=1&rel=0" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  return true;
}

function closeVideoPlayer() {
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