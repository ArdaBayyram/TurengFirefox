'use strict';

const $ = (sel) => document.querySelector(sel);
const form = $('#search-form');
const input = $('#term');
const clearBtn = $('#clear');
const statusEl = $('#status');
const resultsEl = $('#results');
const dirEl = $('#direction');
const siteLink = $('#open-site');
const promoEl = $('#promo');

const INITIAL_ROWS = 25;
const MAX_AUTO_SEARCH = 100;   // longer selections are filled in, not searched

function setStatus(text, isError) {
  statusEl.textContent = text || '';
  statusEl.hidden = !text;
  statusEl.classList.toggle('error', !!isError);
}

/* Lookups go through the background page, which owns the rate limit and cache. */
async function lookup(term) {
  const res = await browser.runtime.sendMessage({ type: 'TURENG_LOOKUP', term });
  if (!res || !res.ok) throw new Error((res && res.error) || 'Lookup failed');
  return res.data;
}

function makeCell(term, pos, lang) {
  const wrap = document.createElement('div');
  wrap.className = lang === 'src' ? 'src' : 'tgt';
  const span = document.createElement('span');
  span.textContent = term;
  wrap.appendChild(span);
  if (pos) {
    const i = document.createElement('span');
    i.className = 'pos';
    i.textContent = pos;
    wrap.appendChild(i);
  }
  return wrap;
}

function render(data) {
  resultsEl.replaceChildren();

  if (data.notFound) {
    setStatus(`No results for “${data.term}”.`);
    dirEl.textContent = '';
    return;
  }
  setStatus('');

  const srcIsEn = data.queryLang === 'en';
  dirEl.textContent = srcIsEn ? 'English → Türkçe' : 'Türkçe → English';

  for (const section of data.sections) {
    const h = document.createElement('div');
    h.className = 'section-title';
    h.textContent = section.phrases ? 'With other terms' : 'Meanings';
    const count = document.createElement('span');
    count.textContent = `  ·  ${section.rows.length}`;
    h.appendChild(count);
    resultsEl.appendChild(h);

    const body = document.createElement('div');
    resultsEl.appendChild(body);

    let shown = 0;
    const draw = (limit) => {
      for (; shown < Math.min(limit, section.rows.length); shown++) {
        const r = section.rows[shown];
        const row = document.createElement('div');
        row.className = 'row';
        const cat = document.createElement('div');
        cat.className = 'cat';
        cat.textContent = r.category;
        row.appendChild(cat);
        row.appendChild(makeCell(srcIsEn ? r.en : r.tr, srcIsEn ? r.enPos : r.trPos, 'src'));
        row.appendChild(makeCell(srcIsEn ? r.tr : r.en, srcIsEn ? r.trPos : r.enPos, 'tgt'));
        body.appendChild(row);
      }
    };

    draw(INITIAL_ROWS);

    if (section.rows.length > shown) {
      const more = document.createElement('button');
      more.className = 'more';
      more.type = 'button';
      const update = () => { more.textContent = `Show ${section.rows.length - shown} more`; };
      update();
      more.addEventListener('click', () => {
        draw(shown + 50);
        if (shown >= section.rows.length) more.remove(); else update();
      });
      resultsEl.appendChild(more);
    }
  }
}

async function search(term) {
  term = String(term || '').trim();
  if (!term) return;

  input.value = term;
  clearBtn.hidden = false;
  siteLink.href = Tureng.url(term);
  resultsEl.replaceChildren();
  dirEl.textContent = '';
  setStatus(`Searching “${term}”…`);

  try {
    render(await lookup(term));
    browser.storage.sync.set({ lastTerm: term });
  } catch (e) {
    setStatus(e.message || 'Lookup failed. Check your connection.', true);
  }
}

/* Tureng Neo promotion slot, configured in src/promo.js. */
function renderPromo() {
  const p = window.TurengPromo;
  if (!p || !p.enabled || (!p.image && !p.text)) return;

  // Several destinations on one image become invisible links laid over each
  // region; a single href makes the whole banner one link.
  const isHttps = (u) => /^https:\/\//.test(u || '');
  let areas = (p.links || []).filter((l) => isHttps(l.href) && Array.isArray(l.area));
  if (!areas.length && isHttps(p.href)) {
    areas = [{ href: p.href, label: p.alt || '', area: [0, 0, 100, 100] }];
  }
  if (!areas.length) return;

  promoEl.replaceChildren();

  if (p.image) {
    const picture = document.createElement('picture');
    if (p.imageDark) {
      const dark = document.createElement('source');
      dark.media = '(prefers-color-scheme: dark)';
      dark.srcset = browser.runtime.getURL(p.imageDark);
      picture.appendChild(dark);
    }
    const img = document.createElement('img');
    img.src = browser.runtime.getURL(p.image);
    img.alt = p.alt || '';
    picture.appendChild(img);
    promoEl.appendChild(picture);
  } else {
    promoEl.classList.add('promo-text');
    promoEl.textContent = p.text;
  }

  for (const l of areas) {
    const a = document.createElement('a');
    a.className = 'promo-hit';
    a.href = l.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = l.label || '';
    a.setAttribute('aria-label', l.label || p.alt || '');
    const [left, top, width, height] = l.area;
    a.style.left = left + '%';
    a.style.top = top + '%';
    a.style.width = width + '%';
    a.style.height = height + '%';
    promoEl.appendChild(a);
  }

  promoEl.hidden = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  search(input.value);
});

input.addEventListener('input', () => { clearBtn.hidden = !input.value; });

clearBtn.addEventListener('click', () => {
  input.value = '';
  clearBtn.hidden = true;
  resultsEl.replaceChildren();
  setStatus('');
  dirEl.textContent = '';
  siteLink.href = Tureng.HOME;
  input.focus();
});

renderPromo();

/* Prefill from the page selection, else the previous search. */
(async function init() {
  const seed = await TurengSelection.fromActiveTab();

  if (seed) {
    input.value = seed;
    clearBtn.hidden = false;
    siteLink.href = Tureng.url(seed);
    if (seed.length <= MAX_AUTO_SEARCH) {
      search(seed);
    } else {
      // Never silently drop a selection -- hand it over and let the user decide.
      input.select();
      setStatus('Long selection - press Enter to search it anyway.');
    }
    return;
  }

  const { lastTerm } = await browser.storage.sync.get('lastTerm');
  if (lastTerm) { input.value = lastTerm; clearBtn.hidden = false; input.select(); }
})();
