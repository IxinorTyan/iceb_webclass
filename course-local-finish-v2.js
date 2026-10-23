(() => {
  const v = document.querySelector('#player video') || document.querySelector('video');
  if (!v) return alert('请先打开课程视频并开始播放，再点击这个书签。');
  if (document.getElementById('__course_finish_v2__')) return;

  const previous = document.getElementById('__local_video_controls__');
  if (previous) {
    const close = [...previous.querySelectorAll('button')].find(b => b.textContent.includes('关闭并恢复'));
    if (close) close.click();
  }

  const mediaProto = v.ownerDocument.defaultView.HTMLMediaElement.prototype;
  const rate = Object.getOwnPropertyDescriptor(mediaProto, 'playbackRate');
  const originalRate = rate.get.call(v);
  const removed = [];
  let alive = true;
  let finishTimer;
  let notice = '';
  let finishing = false;
  let seekStarted = 0;

  const panel = document.createElement('div');
  panel.id = '__course_finish_v2__';
  panel.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;background:#172033;color:white;padding:16px;border-radius:12px;font:14px/1.6 sans-serif;box-shadow:0 4px 24px #0006;max-width:350px';
  const title = document.createElement('strong');
  title.textContent = '课程本地快进 v2';
  const status = document.createElement('div');
  status.style.cssText = 'white-space:pre-line;margin:10px 0';
  panel.append(title, status);

  function button(text, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText = 'margin:4px 6px 0 0;padding:8px;border:0;border-radius:6px;cursor:pointer;color:#172033;background:white';
    b.addEventListener('click', fn);
    panel.append(b);
  }

  function prepare() {
    // The site's CKplayer records its own native listeners here. Remove only
    // its identified seek guard; preserve HLS loading and other seek handlers.
    for (const entry of [...(v.listenerList || [])]) {
      if (entry[0] !== 'seeking' || typeof entry[1] !== 'function') continue;
      const source = Function.prototype.toString.call(entry[1]);
      if (!source.includes('timeScheduleAdjust') || !source.includes('maxSeeTime')) continue;
      if (removed.includes(entry[1])) continue;
      v.removeEventListener('seeking', entry[1], false);
      removed.push(entry[1]);
    }
  }

  function show() {
    const format = t => Number.isFinite(t) ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '--:--';
    if (v.ended) {
      finishing = false;
      notice = '当前视频本地播放已到结尾。课程计分尚未验证。';
    } else if (finishing && seekStarted && Date.now() - seekStarted > 4000 && v.currentTime < v.duration - 3) {
      finishing = false;
      notice = '进度仍被拉回；这个版本未能解除当前限制。';
    }
    status.textContent = format(v.currentTime) + ' / ' + format(v.duration) + ' · 实际 ' + rate.get.call(v) + '×\n' + notice;
  }

  function finish() {
    clearTimeout(finishTimer);
    seekStarted = 0;
    if (!Number.isFinite(v.duration) || v.duration <= 0) {
      notice = '视频尚未加载，请开始播放后再点“推进到结尾”。';
      show();
      return;
    }
    prepare();
    rate.set.call(v, 4);
    finishing = true;
    notice = removed.length ? '已移除已识别的本地快进拦截，正在推进。' : '未识别到对应的快进拦截，尝试推进。';
    show();
    Promise.resolve(v.play()).then(() => {
      if (!alive) return;
      // The site's first-play callback restores a saved position after 100 ms.
      finishTimer = setTimeout(() => {
        if (!alive) return;
        prepare();
        v.currentTime = Math.max(0, v.duration - 1.5);
        seekStarted = Date.now();
        show();
      }, 400);
    }).catch(() => {
      finishing = false;
      notice = '浏览器未允许播放。请手动播放视频，再点“推进到结尾”。';
      show();
    });
  }

  button('推进到结尾', finish);
  button('仅 16 倍速', () => {
    clearTimeout(finishTimer);
    finishing = false;
    prepare();
    rate.set.call(v, 16);
    notice = '已设置实际播放速度为 16 倍。';
    show();
  });
  button('恢复并关闭', () => {
    alive = false;
    clearTimeout(finishTimer);
    clearInterval(timer);
    for (const fn of removed) v.addEventListener('seeking', fn, false);
    rate.set.call(v, originalRate);
    panel.remove();
  });

  (document.body || document.documentElement).append(panel);
  const timer = setInterval(show, 500);
  finish();
})();
