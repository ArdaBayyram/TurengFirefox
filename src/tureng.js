/*
 * Shared Tureng client: URL building, HTML parsing, rate limiting, caching.
 * Every lookup() runs in the background event page; the popup and options
 * pages load this file only for url() and clearCache().
 *
 * Notes on tureng.com's markup (verified against the live site):
 *  - Results live in `table.searchResultsTable`. There can be two of them:
 *    [0] exact meanings, [1] "with other terms" (phrases/idioms).
 *    Both carry id="englishResultsTable", so the id is NOT unique -- always
 *    select by class, never by getElementById.
 *  - Result rows carry class "tureng-manual-stripe-even|odd". Cells are:
 *      td.rc0   row number
 *      td       category ("Common Usage", "General", "Idioms", ...)
 *      td[lang="en"] / td[lang="tr"]   the two terms
 *      td.rc4   overflow menu
 *    The order of the en/tr cells FLIPS depending on the query language, so we
 *    key off the lang attribute rather than the column index.
 *  - Part of speech sits in a trailing <i> inside the term cell ("n.", "v.").
 *  - A miss renders <h1>Term not found</h1> instead of any results table.
 */

var Tureng = (function () {
  'use strict';

  const BASE = 'https://tureng.com/en/turkish-english/';
  const HOME = 'https://tureng.com/';

  /*
   * Usage limits agreed with Tureng for publishing: requests only for
   * user-initiated lookups, at a reasonable rate, and no stored copy of their
   * content. storage.session lives in memory and is never written to disk.
   */
  const MIN_INTERVAL_MS = 1000;            // at most one request per second
  const CACHE_KEY = 'cache:v2';
  const CACHE_MAX = 100;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const LEGACY_CACHE_KEY = 'cache:v1';     // 0.1.x kept results on disk in storage.local

  function url(term) {
    return BASE + encodeURIComponent(String(term).trim());
  }

  // Pull the term out of a cell, keeping the part of speech separate.
  function readCell(td) {
    if (!td) return { text: '', pos: '' };
    const clone = td.cloneNode(true);
    const pos = [...clone.querySelectorAll('i')].map((i) => i.textContent.trim()).join(' ');
    clone.querySelectorAll('i').forEach((i) => i.remove());
    return { text: clone.textContent.replace(/\s+/g, ' ').trim(), pos: pos };
  }

  function parse(html, term) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const h1 = doc.querySelector('h1');
    if (h1 && /term not found/i.test(h1.textContent)) {
      return { term, notFound: true, sections: [] };
    }

    const headings = [...doc.querySelectorAll('h2')].map((h) => h.textContent.trim());
    const tables = [...doc.querySelectorAll('table.searchResultsTable')];

    const sections = [];
    tables.forEach((table, idx) => {
      const rows = [];
      for (const tr of table.querySelectorAll('tr')) {
        if (tr.querySelector('th')) continue;                       // header row
        if (tr.classList.contains('mobile-category-row')) continue; // mobile duplicate
        const enCell = tr.querySelector('td[lang="en"]');
        const trCell = tr.querySelector('td[lang="tr"]');
        if (!enCell || !trCell) continue;

        const cells = tr.querySelectorAll('td');
        const en = readCell(enCell);
        const tk = readCell(trCell);
        if (!en.text || !tk.text) continue;

        rows.push({
          category: cells[1] ? cells[1].textContent.replace(/\s+/g, ' ').trim() : '',
          en: en.text,
          enPos: en.pos,
          tr: tk.text,
          trPos: tk.pos
        });
      }
      if (rows.length) {
        sections.push({
          title: headings[idx] || (idx === 0 ? 'Meanings' : 'Phrases'),
          phrases: idx > 0,
          rows
        });
      }
    });

    // Which language did the user type? The heading says "... in Turkish English
    // Dictionary" for an English query and "... in English Turkish Dictionary"
    // for a Turkish one. Fall back to matching the term against the first row.
    let queryLang = 'en';
    const head = headings[0] || '';
    if (/in English Turkish Dictionary/i.test(head)) queryLang = 'tr';
    else if (/in Turkish English Dictionary/i.test(head)) queryLang = 'en';
    else if (sections.length) {
      const first = sections[0].rows[0];
      const norm = (s) => s.toLocaleLowerCase('tr').trim();
      if (first && norm(first.tr) === norm(term)) queryLang = 'tr';
    }

    return {
      term,
      notFound: sections.length === 0,
      queryLang,
      sections
    };
  }

  async function readCache() {
    try {
      const got = await browser.storage.session.get(CACHE_KEY);
      return got[CACHE_KEY] || {};
    } catch (e) {
      return {};
    }
  }

  async function writeCache(cache) {
    const now = Date.now();
    for (const k of Object.keys(cache)) {
      if (!cache[k] || now - cache[k].at > CACHE_TTL_MS) delete cache[k];
    }
    // LRU trim by insertion order.
    const keys = Object.keys(cache);
    if (keys.length > CACHE_MAX) {
      for (const k of keys.slice(0, keys.length - CACHE_MAX)) delete cache[k];
    }
    try {
      await browser.storage.session.set({ [CACHE_KEY]: cache });
    } catch (e) {
      /* quota -- ignore, cache is best effort */
    }
  }

  // Network requests run one at a time, at least MIN_INTERVAL_MS apart.
  let lastRequestAt = 0;
  let queue = Promise.resolve();

  function throttle(task) {
    const run = queue.then(async () => {
      const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((done) => setTimeout(done, wait));
      lastRequestAt = Date.now();
      return task();
    });
    queue = run.catch(() => {});
    return run;
  }

  async function load(term, key, noCache) {
    if (!noCache) {
      const hit = (await readCache())[key];
      if (hit && Date.now() - hit.at <= CACHE_TTL_MS) return hit.data;
    }

    // The cache write happens inside the throttled task, so writes never overlap.
    return throttle(async () => {
      const res = await fetch(url(term), {
        credentials: 'omit',
        headers: { 'Accept': 'text/html' }
      });
      if (!res.ok) throw new Error('Tureng returned HTTP ' + res.status);

      const parsed = parse(await res.text(), term);

      const cache = await readCache();
      delete cache[key];          // re-insert so it moves to the end (most recent)
      cache[key] = { at: Date.now(), data: parsed };
      await writeCache(cache);

      return parsed;
    });
  }

  // Concurrent lookups of the same term share a single request.
  const inflight = new Map();

  async function lookup(rawTerm, opts) {
    const options = opts || {};
    const term = String(rawTerm || '').trim();
    if (!term) throw new Error('empty term');

    const key = term.toLocaleLowerCase('tr');

    // Registered before the first await, so a concurrent caller always finds it.
    if (!inflight.has(key)) {
      const pending = load(term, key, options.noCache);
      inflight.set(key, pending);
      const cleanup = () => inflight.delete(key);
      pending.then(cleanup, cleanup);
    }
    return inflight.get(key);
  }

  async function clearCache() {
    await Promise.all([
      browser.storage.session.remove(CACHE_KEY),
      browser.storage.local.remove(LEGACY_CACHE_KEY)
    ]);
  }

  return { url, parse, lookup, clearCache, BASE, HOME };
})();

if (typeof module !== 'undefined') module.exports = Tureng;
