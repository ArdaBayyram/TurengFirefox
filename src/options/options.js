'use strict';

const DEFAULTS = { maxResults: 8, openIn: 'inline' };
const openIn = document.querySelector('#openIn');
const maxResults = document.querySelector('#maxResults');
const saved = document.querySelector('#saved');

function flash(text) {
  saved.textContent = text;
  setTimeout(() => { saved.textContent = ''; }, 1500);
}

async function load() {
  const cfg = { ...DEFAULTS, ...(await browser.storage.sync.get(DEFAULTS)) };
  openIn.value = cfg.openIn;
  maxResults.value = cfg.maxResults;
}

openIn.addEventListener('change', () => {
  browser.storage.sync.set({ openIn: openIn.value });
  flash('Saved');
});

maxResults.addEventListener('change', () => {
  const n = Math.min(25, Math.max(1, parseInt(maxResults.value, 10) || DEFAULTS.maxResults));
  maxResults.value = n;
  browser.storage.sync.set({ maxResults: n });
  flash('Saved');
});

document.querySelector('#clear-cache').addEventListener('click', async () => {
  await Tureng.clearCache();
  flash('Cache cleared');
});

load();
