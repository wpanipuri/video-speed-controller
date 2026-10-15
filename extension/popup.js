(() => {
  'use strict';
  const api = globalThis.browser ?? globalThis.chrome;
  const PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  const STEP = 0.25, MIN = 0.1, MAX = 16;
  const $ = (id) => document.getElementById(id);
  const clamp = (v) => Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));

  let tabId = null, host = '', speed = 1, saveTimer = 0, disabledHosts = [];

  function render() {
    $('speedVal').textContent = speed.toFixed(2);
    document.querySelectorAll('#presets button').forEach((b) =>
      b.classList.toggle('active', Math.abs(Number(b.dataset.v) - speed) < 0.001));
  }

  function setSpeed(v) {
    speed = clamp(v);
    render();
    if (tabId != null) Promise.resolve(api.tabs.sendMessage(tabId, { type: 'vsc:set', speed })).catch(() => {});
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => api.storage.local.set({ speed }), 250);
  }

  async function init() {
    PRESETS.forEach((p) => {
      const b = document.createElement('button');
      b.textContent = p + '×';
      b.dataset.v = p;
      b.onclick = () => setSpeed(p);
      $('presets').appendChild(b);
    });
    $('minus').onclick = () => setSpeed(speed - STEP);
    $('plus').onclick = () => setSpeed(speed + STEP);

    const saved = await api.storage.local.get({ speed: 1, disabledHosts: [] });
    disabledHosts = saved.disabledHosts || [];

    let tab = null;
    try { [tab] = await api.tabs.query({ active: true, currentWindow: true }); } catch (e) {}
    tabId = tab ? tab.id : null;
    try { host = new URL(tab.url).hostname; } catch (e) { host = ''; }

    let resp = null;
    if (tabId != null) { try { resp = await api.tabs.sendMessage(tabId, { type: 'vsc:get' }); } catch (e) {} }
    speed = clamp(resp && resp.speed ? resp.speed : saved.speed);

    const st = $('status');
    if (resp) { st.textContent = 'Video detected'; st.className = 'status ok'; }
    else if (!host) { st.textContent = 'Not available on this page'; st.className = 'status none'; }
    else { st.textContent = 'No video found yet'; st.className = 'status none'; }

    const dis = $('disableSite');
    if (host) {
      $('hostName').textContent = host;
      dis.checked = disabledHosts.includes(host);
      dis.onchange = () => {
        const s = new Set(disabledHosts);
        dis.checked ? s.add(host) : s.delete(host);
        disabledHosts = [...s];
        api.storage.local.set({ disabledHosts });
      };
    } else dis.disabled = true;

    render();
  }
  init();
})();
