(function() {
  'use strict';
  var chapter = document.querySelector('.chapter');
  if (!chapter) return;
  if (!window.speechSynthesis) return;

  var utterances = [];
  var currentIdx = 0;
  var isPlaying = false;
  var synth = window.speechSynthesis;
  var bar = null;
  var playBtn, pauseBtn, stopBtn, progressSpan;

  function extractText() {
    var clone = chapter.cloneNode(true);
    var exclude = clone.querySelectorAll('nav, script, style, .tts-bar');
    exclude.forEach(function(el) { el.remove(); });
    var text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    var sentences = text.match(/[^.!?\n]+[.!?]|\S+/g) || [text];
    return sentences.map(function(s) { return s.trim(); }).filter(Boolean);
  }

  function createBar() {
    bar = document.createElement('div');
    bar.className = 'tts-bar';
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px;padding:12px 16px;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:10px;font-size:.9rem;';

    var icon = document.createElement('span');
    icon.textContent = '🎧';
    icon.style.fontSize = '1.2rem';

    var label = document.createElement('span');
    label.textContent = 'Listen:';
    label.style.fontWeight = '600';
    label.style.color = '#1e40af';

    var btnStyle = 'padding:6px 16px;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:.85rem;transition:.15s;';

    playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = btnStyle + 'background:#1e40af;color:#fff;';
    playBtn.onmouseover = function() { playBtn.style.background = '#1e3a8a'; };
    playBtn.onmouseout = function() { playBtn.style.background = '#1e40af'; };

    pauseBtn = document.createElement('button');
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.style.cssText = btnStyle + 'background:#eab308;color:#000;display:none;';
    pauseBtn.onmouseover = function() { pauseBtn.style.background = '#ca8a04'; };
    pauseBtn.onmouseout = function() { pauseBtn.style.background = '#eab308'; };

    stopBtn = document.createElement('button');
    stopBtn.textContent = '⏹ Stop';
    stopBtn.style.cssText = btnStyle + 'background:#dc2626;color:#fff;display:none;';
    stopBtn.onmouseover = function() { stopBtn.style.background = '#b91c1c'; };
    stopBtn.onmouseout = function() { stopBtn.style.background = '#dc2626'; };

    progressSpan = document.createElement('span');
    progressSpan.style.cssText = 'font-size:.8rem;color:#6b7280;margin-left:auto;';

    bar.appendChild(icon);
    bar.appendChild(label);
    bar.appendChild(playBtn);
    bar.appendChild(pauseBtn);
    bar.appendChild(stopBtn);
    bar.appendChild(progressSpan);

    chapter.insertBefore(bar, chapter.firstChild);

    playBtn.addEventListener('click', startPlayback);
    pauseBtn.addEventListener('click', togglePause);
    stopBtn.addEventListener('click', stopPlayback);
  }

  function speak(idx) {
    if (idx >= utterances.length) { stopPlayback(); return; }
    currentIdx = idx;
    var u = new SpeechSynthesisUtterance(utterances[idx]);
    u.rate = 0.9;
    u.pitch = 1;
    u.volume = 1;

    u.onstart = function() {
      isPlaying = true;
      playBtn.style.display = 'none';
      pauseBtn.style.display = '';
      stopBtn.style.display = '';
      updateProgress();
    };

    u.onend = function() {
      speak(idx + 1);
    };

    u.onerror = function() {
      stopPlayback();
    };

    synth.speak(u);
  }

  function startPlayback() {
    if (synth.speaking) return;
    speak(currentIdx);
  }

  function togglePause() {
    if (synth.speaking) {
      synth.pause();
      pauseBtn.textContent = '▶ Resume';
    } else {
      synth.resume();
      pauseBtn.textContent = '⏸ Pause';
    }
  }

  function stopPlayback() {
    synth.cancel();
    isPlaying = false;
    playBtn.style.display = '';
    pauseBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    pauseBtn.textContent = '⏸ Pause';
    currentIdx = 0;
    updateProgress();
  }

  function updateProgress() {
    if (utterances.length > 0) {
      var pct = Math.min(100, Math.round((currentIdx / utterances.length) * 100));
      progressSpan.textContent = currentIdx + ' / ' + utterances.length + ' (' + pct + '%)';
    } else {
      progressSpan.textContent = '';
    }
  }

  utterances = extractText();
  if (utterances.length > 0) {
    createBar();
    updateProgress();
  }
})();
