/*
 * Injected on demand (context menu / Alt+T) via scripting.executeScript.
 * Re-injection is expected, so everything is guarded behind a single flag and
 * the UI lives in a shadow root to keep the host page's CSS out.
 */
(() => {
  'use strict';

  if (window.__turengInlineReady) return;
  window.__turengInlineReady = true;

  const HOST_ID = 'tureng-inline-host';
  let host = null;
  let root = null;

  const CSS = `
    :host { all: initial; }
    .panel {
      position: absolute;
      z-index: 2147483647;
      min-width: 280px;
      max-width: 420px;
      max-height: 340px;
      overflow: auto;
      background: #fff;
      color: #1c1c1e;
      border: 1px solid #e2e2e5;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,.18);
      font: 13px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif;
      padding: 0;
    }
    @media (prefers-color-scheme: dark) {
      .panel { background: #232327; color: #ececf1; border-color: #3a3a41; }
      .head { border-color: #3a3a41 !important; }
      .row { border-color: #33333a !important; }
      .row:hover { background: #2c2c33 !important; }
      .foot { border-color: #3a3a41 !important; color: #9a9aa2 !important; }
      .foot b { color: #ececf1 !important; }
    }
    .head {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
      position: sticky; top: 0;
      background: inherit;
      font-weight: 600;
    }
    .head .term { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .head button {
      border: 0; background: none; cursor: pointer;
      color: #a4161a; font-size: 12px; text-decoration: none; padding: 0 2px;
    }
    .row {
      display: flex; gap: 8px; padding: 5px 10px;
      border-top: 1px solid #f1f1f3;
    }
    .row:hover { background: #faf7f7; }
    .row .s { font-weight: 600; flex: 1; }
    .row .t { flex: 1.2; }
    .pos { color: #8a8a90; font-style: italic; font-size: 11px; margin-left: 3px; }
    .msg { padding: 12px 10px; color: #75757b; }
    .msg.err { color: #a4161a; }
    .foot {
      display: flex; justify-content: space-between; align-items: center; gap: 10px;
      padding: 6px 10px;
      border-top: 1px solid #eee;
      position: sticky; bottom: 0;
      background: inherit;
      font-size: 11px; color: #75757b;
    }
    .foot b { color: #1c1c1e; font-weight: 600; }
    .foot a { color: #a4161a; text-decoration: none; white-space: nowrap; }
    .foot a:hover { text-decoration: underline; }
  `;

  function ensure() {
    if (host && document.body.contains(host)) return;
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:absolute;top:0;left:0;width:0;height:0;';
    root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    const panel = document.createElement('div');
    panel.className = 'panel';
    root.appendChild(panel);
    document.body.appendChild(host);
  }

  function panel() { ensure(); return root.querySelector('.panel'); }

  function place() {
    const sel = window.getSelection();
    let x = window.scrollX + 20;
    let y = window.scrollY + 20;
    if (sel && sel.rangeCount) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r.width || r.height) {
        x = r.left + window.scrollX;
        y = r.bottom + window.scrollY + 8;
      }
    }
    const p = panel();
    const maxX = window.scrollX + document.documentElement.clientWidth - 440;
    p.style.left = Math.max(window.scrollX + 8, Math.min(x, maxX)) + 'px';
    p.style.top = y + 'px';
  }

  function header(term) {
    const head = document.createElement('div');
    head.className = 'head';

    const t = document.createElement('span');
    t.className = 'term';
    t.textContent = term;
    head.appendChild(t);

    const close = document.createElement('button');
    close.textContent = '✕';
    close.title = 'Close';
    close.addEventListener('click', hide);
    head.appendChild(close);

    return head;
  }

  // Tureng's condition for publishing: wherever results appear, name Tureng as
  // the source and link to tureng.com. Sticky, so it stays visible while scrolling.
  function attribution(href, more) {
    const foot = document.createElement('div');
    foot.className = 'foot';

    const source = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = 'Tureng';
    source.append('Results from ', name);
    foot.appendChild(source);

    const link = document.createElement('a');
    link.href = href || 'https://tureng.com/';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = more > 0 ? `${more} more on tureng.com ↗` : 'tureng.com ↗';
    foot.appendChild(link);

    return foot;
  }

  function show() { panel().style.display = 'block'; place(); }
  function hide() { if (root) panel().style.display = 'none'; }

  function renderLoading(term) {
    const p = panel();
    p.replaceChildren(header(term));
    const m = document.createElement('div');
    m.className = 'msg';
    m.textContent = 'Searching…';
    p.appendChild(m);
    show();
  }

  function renderError(term, message, href) {
    const p = panel();
    p.replaceChildren(header(term));
    const m = document.createElement('div');
    m.className = 'msg err';
    m.textContent = message;
    p.appendChild(m);
    p.appendChild(attribution(href, 0));
    show();
  }

  function renderResult(term, data, maxResults, href) {
    const p = panel();
    p.replaceChildren(header(term));

    if (data.notFound || !data.sections.length) {
      const m = document.createElement('div');
      m.className = 'msg';
      m.textContent = 'No results found.';
      p.appendChild(m);
      p.appendChild(attribution(href, 0));
      show();
      return;
    }

    const srcIsEn = data.queryLang === 'en';
    const rows = data.sections[0].rows.slice(0, maxResults || 8);

    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'row';

      const s = document.createElement('div');
      s.className = 's';
      s.textContent = srcIsEn ? r.en : r.tr;
      const sp = srcIsEn ? r.enPos : r.trPos;
      if (sp) { const i = document.createElement('span'); i.className = 'pos'; i.textContent = sp; s.appendChild(i); }
      row.appendChild(s);

      const t = document.createElement('div');
      t.className = 't';
      t.textContent = srcIsEn ? r.tr : r.en;
      row.appendChild(t);

      p.appendChild(row);
    }

    const total = data.sections.reduce((n, sec) => n + sec.rows.length, 0);
    p.appendChild(attribution(href, total - rows.length));

    show();
  }

  browser.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'TURENG_LOADING') renderLoading(msg.term);
    else if (msg.type === 'TURENG_RESULT') renderResult(msg.term, msg.data, msg.maxResults, msg.href);
    else if (msg.type === 'TURENG_ERROR') renderError(msg.term, msg.message, msg.href);
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
  document.addEventListener('mousedown', (e) => {
    if (host && e.target !== host && !host.contains(e.target)) hide();
  }, true);
})();
