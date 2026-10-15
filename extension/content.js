/*
 * Video Speed Controller - content script (simple version)
 * - Finds every <video>/<audio> on the page (also in iframes / shadow DOM)
 * - Applies your speed and keeps it
 * - Shows the speed in the MIDDLE of the video when it changes
 * - Keys: S = slower, D = faster, R = reset
 */
(() => {
  'use strict';
  if (window.__vscLoaded) return;
  window.__vscLoaded = true;

  const api = globalThis.browser ?? globalThis.chrome;
  const STEP = 0.25, MIN = 0.1, MAX = 16;
  const clamp = (v) => Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));
  const fmt = (v) => v.toFixed(2).replace(/\.?0+$/, '') + '×';

  let speed = 1;
  let touched = false;
  let enabled = true;
  let disabledHosts = [];
  const media = new Set();
  let fights = [];

  const topHost = (() => {
    try {
      if (window.top === window) return location.hostname;
      const o = location.ancestorOrigins;
      if (o && o.length) return new URL(o[o.length - 1]).hostname;
    } catch (e) {}
    return location.hostname;
  })();

  /* ---------- apply speed ---------- */
  function setRaw(el, v) {
    try {
      el.preservesPitch = true;
      el.mozPreservesPitch = true;
      el.webkitPreservesPitch = true;
      el.playbackRate = v;
    } catch (e) {}
  }
  function setRate(el) {
    if (enabled && touched && Math.abs(el.playbackRate - speed) > 0.001) setRaw(el, speed);
  }
  function onRateChange(e) {
    if (!enabled || !touched) return;
    if (Math.abs(e.target.playbackRate - speed) < 0.001) return;
    const now = Date.now();
    fights = fights.filter((t) => now - t < 2000);
    if (fights.length >= 10) return; // don't fight a page forever
    fights.push(now);
    setRate(e.target);
  }
  function register(el) {
    if (media.has(el)) return;
    media.add(el);
    el.addEventListener('ratechange', onRateChange);
    el.addEventListener('loadedmetadata', () => setRate(el));
    setRate(el);
  }
  function collect(root) {
    root.querySelectorAll('video, audio').forEach(register);
    root.querySelectorAll('*').forEach((n) => n.shadowRoot && collect(n.shadowRoot));
  }
  let scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = 0;
      media.forEach((m) => { if (!m.isConnected) media.delete(m); });
      collect(document);
    }, 700);
  }

  let saveTimer = 0;
  function setSpeed(v, save = true) {
    speed = clamp(v);
    touched = true;
    media.forEach(setRate);
    showIndicator();
    if (save) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { try { api.storage.local.set({ speed }); } catch (e) {} }, 300);
    }
  }

  /* ---------- centered indicator ---------- */
  let host, badge, hideTimer;

  function bestVideo() {
    let best = null, bestScore = 0;
    media.forEach((m) => {
      if (m.tagName !== 'VIDEO' || !m.isConnected) return;
      const r = m.getBoundingClientRect();
      if (r.width < 120 || r.height < 70) return;
      if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return;
      const score = r.width * r.height * (m.paused ? 1 : 3);
      if (score > bestScore) { best = m; bestScore = score; }
    });
    return best;
  }

  function build() {
    host = document.createElement('div');
    host.setAttribute('data-vsc', '');
    host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        .b{position:absolute;transform:translate(-50%,-50%) scale(.9);
          padding:12px 26px;border-radius:999px;background:rgba(0,0,0,.2);color:#fff;
          font:700 30px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          opacity:0;
          transition:opacity .18s ease,transform .18s ease;white-space:nowrap}
        .b.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
      </style><div class="b"></div>`;
    badge = root.querySelector('.b');
  }

  function showIndicator() {
    if (!enabled) return;
    const v = bestVideo();
    if (!v) return;
    if (!host) build();
    const fs = document.fullscreenElement;
    const parent = fs && fs.tagName !== 'VIDEO' ? fs : document.documentElement;
    if (host.parentNode !== parent) parent.appendChild(host);

    const r = v.getBoundingClientRect();
    const cx = Math.max(0, r.left) + (Math.min(innerWidth, r.right) - Math.max(0, r.left)) / 2;
    const cy = Math.max(0, r.top) + (Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / 2;
    badge.style.left = cx + 'px';
    badge.style.top = cy + 'px';
    badge.textContent = fmt(speed);
    badge.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => badge.classList.remove('show'), 900);
  }

  /* ---------- keyboard ---------- */
  function typing(e) {
    const t = (e.composedPath && e.composedPath()[0]) || e.target;
    if (!t || !t.tagName) return false;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable;
  }
  document.addEventListener('keydown', (e) => {
    if (!enabled || !media.size || e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    const k = (e.key || '').toLowerCase();
    if (k === 's') setSpeed(speed - STEP);
    else if (k === 'd') setSpeed(speed + STEP);
    else if (k === 'r') setSpeed(1);
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  /* ---------- popup messages + settings ---------- */
  api.runtime.onMessage.addListener((msg, _s, reply) => {
    if (!msg) return;
    if (msg.type === 'vsc:get') {
      if (!media.size) return;
      reply({ speed: touched ? speed : ([...media][0].playbackRate || 1), count: media.size });
    } else if (msg.type === 'vsc:set') {
      setSpeed(msg.speed, false);
      reply({ ok: true });
    }
  });

  function applyHosts() {
    const was = enabled;
    enabled = !disabledHosts.includes(topHost);
    if (was && !enabled && touched) media.forEach((m) => setRaw(m, 1));
    if (!was && enabled && touched) media.forEach(setRate);
  }
  api.storage.onChanged.addListener((c, area) => {
    if (area === 'local' && c.disabledHosts) {
      disabledHosts = c.disabledHosts.newValue || [];
      applyHosts();
    }
  });

  function start() {
    applyHosts();
    collect(document);
    new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
    ['loadstart', 'loadedmetadata', 'play', 'playing'].forEach((ev) =>
      document.addEventListener(ev, (e) => {
        const t = e.target;
        if (t && (t.tagName === 'VIDEO' || t.tagName === 'AUDIO')) { register(t); setRate(t); }
      }, true));
  }

  Promise.resolve(api.storage.local.get({ speed: 1, disabledHosts: [] }))
    .then((s) => {
      disabledHosts = s.disabledHosts || [];
      if (Number(s.speed) && Number(s.speed) !== 1) { speed = clamp(Number(s.speed)); touched = true; }
    })
    .catch(() => {})
    .then(start);
})();
