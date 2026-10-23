(() => {
  const panelId = '__local_video_controls__';
  if (document.getElementById(panelId)) return;

  let speed = 4;
  let fast = false;
  const originals = new Map();
  const panel = document.createElement('div');
  panel.id = panelId;
  panel.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;background:#172033;color:white;padding:16px;border-radius:12px;font:14px/1.6 sans-serif;box-shadow:0 4px 24px #0006;max-width:330px';
  const heading = document.createElement('strong');
  heading.textContent = '视频倍速 / 快进';
  panel.append(heading);
  const status = document.createElement('div');
  status.style.cssText = 'margin:8px 0;white-space:pre-line';
  panel.append(status);
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
  panel.append(buttons);

  function videos() {
    const found = new Set();
    const visited = new Set();
    function walk(root) {
      if (!root || visited.has(root)) return;
      visited.add(root);
      for (const v of root.querySelectorAll('video')) {
        if (v.getClientRects().length) found.add(v);
      }
      for (const frame of root.querySelectorAll('iframe,frame')) {
        try { walk(frame.contentDocument); } catch (_) { /* Different origin. */ }
      }
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    }
    walk(document);
    return [...found];
  }

  function seek(v, seconds) {
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    try { v.currentTime = Math.min(v.duration, v.currentTime + seconds); } catch (_) {}
  }

  function button(label, action) {
    const b = document.createElement('button');
    b.textContent = label;
    b.type = 'button';
    b.style.cssText = 'background:#fff;color:#172033;border:0;border-radius:6px;padding:7px 10px;cursor:pointer;font:14px sans-serif';
    b.addEventListener('click', action);
    buttons.append(b);
    return b;
  }

  for (const n of [1, 2, 4, 8, 16]) {
    button(n + '×', () => { speed = n; fast = false; tick(false); });
  }
  button('+30 秒', () => { videos().forEach(v => seek(v, 30)); tick(false); });
  const fastButton = button('快速走进度', () => { fast = !fast; tick(false); });
  button('关闭并恢复倍速', () => {
    clearInterval(timer);
    for (const [v, original] of originals) {
      try { v.playbackRate = original; } catch (_) {}
    }
    panel.remove();
  });

  function tick(advance) {
    const list = videos();
    for (const v of list) {
      if (!originals.has(v)) originals.set(v, v.playbackRate);
      try { if (v.playbackRate !== speed) v.playbackRate = speed; } catch (_) {}
      if (fast && advance && !v.ended) seek(v, 15);
    }
    fastButton.textContent = fast ? '停止快速推进' : '快速走进度';
    if (!list.length) {
      status.textContent = '未找到可控制的视频。\n请先打开课程播放器；跨域 iframe 可能无法控制。';
      return;
    }
    const v = list[0];
    const time = x => Number.isFinite(x) ? Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0') : '--:--';
    status.textContent = speed + '× · ' + time(v.currentTime) + ' / ' + time(v.duration) + (fast ? '\n每半秒推进 15 秒' : '');
  }

  (document.body || document.documentElement).append(panel);
  const timer = setInterval(() => tick(true), 500);
  tick(false);
})();
