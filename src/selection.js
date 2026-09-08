/*
 * Reading the user's page selection.
 *
 * window.getSelection() alone is not enough:
 *  - it returns "" for text selected inside <input>/<textarea>, which need
 *    selectionStart/selectionEnd on the focused element instead;
 *  - it only covers the frame it runs in, so a selection inside an iframe is
 *    invisible unless the script is injected into all frames.
 */
'use strict';

/* Injected into the page. Must be self-contained: executeScript serializes
   this function's source, so it cannot close over anything out here. */
function __turengReadSelection() {
  const el = document.activeElement;
  let text = '';
  if (
    el &&
    (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') &&
    typeof el.selectionStart === 'number' &&
    el.selectionStart !== el.selectionEnd
  ) {
    text = el.value.slice(el.selectionStart, el.selectionEnd);
  } else {
    const sel = window.getSelection();
    text = sel ? sel.toString() : '';
  }
  // hasFocus() distinguishes the frame the user is actually working in from
  // frames still holding a stale selection.
  return { text: text, focused: document.hasFocus() };
}

var TurengSelection = (function () {
  // Collapse newlines/runs of space so a wrapped selection is still a clean query.
  function normalize(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  async function fromTab(tabId) {
    if (tabId == null) return '';
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: __turengReadSelection
      });
      // Prefer the focused frame; fall back to any frame with a selection, since
      // an open popup can leave no frame reporting focus.
      let fallback = '';
      for (const r of results || []) {
        const value = (r && r.result) || {};
        const text = normalize(value.text);
        if (!text) continue;
        if (value.focused) return text;
        if (!fallback) fallback = text;
      }
      if (fallback) return fallback;
    } catch (e) {
      /* Privileged page (about:, addons.mozilla.org, PDF viewer) -- no access. */
    }
    return '';
  }

  async function fromActiveTab() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) return '';
    return fromTab(tab.id);
  }

  return { normalize, fromTab, fromActiveTab };
})();
