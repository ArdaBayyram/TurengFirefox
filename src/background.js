/*
 * Background event page (Firefox MV3 uses background.scripts, not a service
 * worker -- which is why `Tureng.parse` can rely on DOMParser here).
 */
'use strict';

const MENU_ID = 'tureng-lookup-selection';

const DEFAULTS = {
  maxResults: 8,
  openIn: 'inline'   // 'inline' = overlay on the page, 'tab' = open tureng.com
};

async function settings() {
  const got = await browser.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...got };
}

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: MENU_ID,
      title: 'Tureng: "%s"',
      contexts: ['selection']
    });
  });
});

function openInTab(term) {
  return browser.tabs.create({ url: Tureng.url(term) });
}

/* Make sure the overlay script is present, then hand it a payload. */
async function sendToPage(tabId, message) {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['src/content/inline.js']
    });
    await browser.tabs.sendMessage(tabId, message);
    return true;
  } catch (e) {
    // Injection is refused on privileged pages (about:, addons.mozilla.org,
    // view-source:, the PDF viewer...). Nothing we can do there.
    return false;
  }
}

async function lookupInPage(tabId, term) {
  const cfg = await settings();

  if (cfg.openIn === 'tab') {
    await openInTab(term);
    return;
  }

  const shown = await sendToPage(tabId, { type: 'TURENG_LOADING', term });
  if (!shown) {
    await openInTab(term);   // fall back rather than failing silently
    return;
  }

  try {
    const data = await Tureng.lookup(term);
    await browser.tabs.sendMessage(tabId, {
      type: 'TURENG_RESULT',
      term,
      data,
      maxResults: cfg.maxResults,
      href: Tureng.url(term)
    });
  } catch (e) {
    await browser.tabs.sendMessage(tabId, {
      type: 'TURENG_ERROR',
      term,
      message: e.message || 'Lookup failed',
      href: Tureng.url(term)
    });
  }
}

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const term = (info.selectionText || '').trim();
  if (!term || !tab || tab.id == null) return;
  lookupInPage(tab.id, term);
});

browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'lookup-selection') return;

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;

  const term = await TurengSelection.fromTab(tab.id);
  if (term) lookupInPage(tab.id, term);
});

/* The overlay asks for follow-up lookups when a term inside it is clicked. */
browser.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'TURENG_REQUEST') return;
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return;
  lookupInPage(tabId, String(msg.term || '').trim());
});
